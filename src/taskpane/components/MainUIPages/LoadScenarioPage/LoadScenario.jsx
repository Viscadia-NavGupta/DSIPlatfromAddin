import React, { useState, useEffect, useRef } from "react";
import { RiArrowDropDownLine } from "react-icons/ri";
import {
  Container,
  Heading,
  MessageBox,
  DropdownContainer,
  CustomDropdown,
  DropdownButton,
  DropdownList,
  DropdownItem,
  SaveButton,
  DropdownArrow,
} from "./Loadscenariostyles";
import * as AWSconnections from "../../Middleware/AWSConnections";
import * as InputfileConnections from "../../Middleware/inputfile";

const LoadScenario = ({ setPageValue }) => {
  const [modelIDValue, setModelIDValue] = useState("");
  const [saveStatus, setSaveStatus] = useState(null);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [heading, setHeading] = useState("Active Sheet Name");
  const [isOutputSheet, setIsOutputSheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metadataLoaded, setMetadataLoaded] = useState(false); // Track metadata loading

  // Add warnings state
  const [warnings, setWarnings] = useState({
    saveStatus: false,
    cycle: false,
    scenario: false,
  });

  const [fullData, setFullData] = useState([]);
  const [filteredSaveStatus, setFilteredSaveStatus] = useState([]);
  const [filteredCycles, setFilteredCycles] = useState([]);
  const [filteredScenarios, setFilteredScenarios] = useState([]);

  const [dropdownOpen, setDropdownOpen] = useState({
    saveStatus: false,
    cycle: false,
    scenario: false,
  });

  const dropdownRefs = {
    saveStatus: useRef(null),
    cycle: useRef(null),
    scenario: useRef(null),
  };

  useEffect(() => {
    function handleClickOutside(event) {
      Object.keys(dropdownRefs).forEach((key) => {
        if (dropdownRefs[key].current && !dropdownRefs[key].current.contains(event.target)) {
          setDropdownOpen((prev) => ({ ...prev, [key]: false }));
        }
      });
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const initSheet = async () => {
      await checkofCloudBackendSheet();
    };
    initSheet();
  }, []);

  useEffect(() => {
    if (modelIDValue) {
      fetchDataFromLambda();
    }
  }, [modelIDValue]);

  // Update dropdown options when selections change
  useEffect(() => {
    if (fullData.length > 0) {
      updateDropdownOptions();
    }
  }, [saveStatus, selectedCycle, selectedScenario, fullData]);

  const checkofCloudBackendSheet = async () => {
    try {
      console.log("📊 Checking for Output Sheet...");
      if (typeof window.Excel === "undefined") {
        console.error("🚨 Excel API is not available.");
        setLoading(false);
        return;
      }
      await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        sheets.load("items/name");
        await context.sync();

        const MetaDataSheet = sheets.items.find(
          (sheet) => sheet.name.toLowerCase() === "cloud_backend_md"
        );

        if (MetaDataSheet) {
          const ModelName = MetaDataSheet.getRange("B5");
          const ModelID = MetaDataSheet.getRange("B7");
          ModelName.load("values");
          ModelID.load("values");
          await context.sync();

          const ModelNameValue = ModelName.values[0][0] || "";
          const ModelIDValue = ModelID.values[0][0] || "";

          setHeading(`Import Scenario for: ${ModelNameValue}`);
          setIsOutputSheet(true);
          setModelIDValue(ModelIDValue);
          console.log("✅ Model ID Fetched:", ModelIDValue);
        } else {
          console.log("⚠️ No Output Sheet Found.");
          setIsOutputSheet(false);
        }
        setLoading(false);
      });
    } catch (error) {
      console.error("🚨 Error checking for Outputs sheet:", error);
      setIsOutputSheet(false);
      setLoading(false);
    }
  };

  const fetchDataFromLambda = async () => {
    try {
      console.log("📤 Fetching Data from Lambda...");
      setMetadataLoaded(false); // Mark metadata as loading
      const responseBody = await AWSconnections.FetchMetaData(
        "FETCH_METADATA",
        localStorage.getItem("idToken"),
        "dsivis-dev-remaining-secrets",
        localStorage.getItem("User_ID"),
        localStorage.getItem("username")
      );

      if (!responseBody || !responseBody.results1) {
        throw new Error("❌ No results1 found in Lambda response.");
      }

      console.log("✅ Full Metadata Response:", responseBody.results1);

      const filteredData = responseBody.results1.filter((row) => row.model_id === modelIDValue);
      setFullData(filteredData);
      
      // Initialize with all available options
      setFilteredSaveStatus([...new Set(filteredData.map((row) => row.save_status).filter(Boolean))]);
      setFilteredCycles([...new Set(filteredData.map((row) => row.cycle_name).filter(Boolean))]);
      setFilteredScenarios([...new Set(filteredData.map((row) => row.scenario_name).filter(Boolean))]);

      setMetadataLoaded(true); // Mark metadata as fully loaded
    } catch (error) {
      console.error("🚨 Error fetching data from Lambda:", error);
      setMetadataLoaded(true); // Ensure dropdowns do not stay stuck
    }
  };

  const updateDropdownOptions = () => {
    // Start with the full dataset
    let filteredData = [...fullData];

    // Apply filters based on current selections
    if (saveStatus) {
      filteredData = filteredData.filter((row) => row.save_status === saveStatus);
    }
    
    if (selectedCycle) {
      filteredData = filteredData.filter((row) => row.cycle_name === selectedCycle);
    }
    
    if (selectedScenario) {
      filteredData = filteredData.filter((row) => row.scenario_name === selectedScenario);
    }

    // Update dropdown options based on the filtered data
    if (!saveStatus) {
      setFilteredSaveStatus([...new Set(filteredData.map((row) => row.save_status).filter(Boolean))]);
    }
    
    if (!selectedCycle) {
      setFilteredCycles([...new Set(filteredData.map((row) => row.cycle_name).filter(Boolean))]);
    }
    
    if (!selectedScenario) {
      setFilteredScenarios([...new Set(filteredData.map((row) => row.scenario_name).filter(Boolean))]);
    }
  };

  const handleSelect = (key, value) => {
    // Reset other selections when changing a dropdown
    if (key === "saveStatus") {
      setSaveStatus(value);
      // Only reset the other values if they don't exist in the filtered data
      const filteredBySaveStatus = fullData.filter(row => row.save_status === value);
      const availableCycles = [...new Set(filteredBySaveStatus.map(row => row.cycle_name))];
      const availableScenarios = [...new Set(filteredBySaveStatus.map(row => row.scenario_name))];
      
      if (!availableCycles.includes(selectedCycle)) {
        setSelectedCycle(null);
      }
      
      if (!availableScenarios.includes(selectedScenario)) {
        setSelectedScenario(null);
      }
    } 
    
    if (key === "cycle") {
      setSelectedCycle(value);
      // Filter based on current saveStatus and new cycle
      const filteredByCycle = fullData.filter(row => 
        (!saveStatus || row.save_status === saveStatus) && 
        row.cycle_name === value
      );
      const availableScenarios = [...new Set(filteredByCycle.map(row => row.scenario_name))];
      
      if (!availableScenarios.includes(selectedScenario)) {
        setSelectedScenario(null);
      }
    }
    
    if (key === "scenario") {
      setSelectedScenario(value);
    }
    
    setDropdownOpen((prev) => ({ ...prev, [key]: false }));
  };

  const handleImportClick = async () => {
    console.log("🚀 Import Scenario button clicked!");
    console.log("✅ Current State Before Warnings:");
    console.log(" - saveStatus:", saveStatus);
    console.log(" - selectedCycle:", selectedCycle);
    console.log(" - selectedScenario:", selectedScenario);

    let newWarnings = {
      saveStatus: !saveStatus,
      cycle: !selectedCycle,
      scenario: !selectedScenario,
    };
    setWarnings(newWarnings);
    console.log("⚠️ Warnings Set:", newWarnings);

    if (!saveStatus || !selectedCycle || !selectedScenario) {
      console.warn("🚨 Import failed: One or more dropdowns are empty.");
      return;
    }

    console.log("✅ Selected values are valid. Proceeding with data processing...");

    if (fullData.length === 0) {
      console.warn("⚠️ fullData is empty. No data available for filtering.");
      return;
    }

    const forecastIdArray = fullData
      .filter(
        (row) =>
          row.save_status === saveStatus &&
          row.cycle_name === selectedCycle &&
          row.scenario_name === selectedScenario
      )
      .map((row) => row.forecast_id.replace("forecast_", ""));

    console.log("📌 Extracted Forecast IDs:", forecastIdArray);

    if (forecastIdArray.length === 0) {
      console.warn("⚠️ No matching forecast IDs found.");
      return;
    }

    console.log("⏳ Importing scenario...");
    setPageValue("LoadingCircleComponent", "0% | Importing Scenario...");

    try {
      let Downloadflag = await AWSconnections.service_orchestration(
        "IMPORT_ASSUMPTIONS",
        "",
        modelIDValue,
        selectedScenario,
        selectedCycle,
        "",
        "",
        forecastIdArray
      );

      console.log("🛠 API Response:", Downloadflag);

      if (Downloadflag && Downloadflag.status === "Scenario Imported") {
        await InputfileConnections.exportData2();
        setPageValue("LoadingCircleComponent", "75% | Importing data...");

        console.log("✅ Scenario Imported Successfully!");
        setPageValue("SaveForecastPageinterim", "Scenario Imported");
      } else {
        console.error("🚨 Scenario Import Failed:", Downloadflag);
      }
    } catch (error) {
      console.error("🚨 Error calling service_orchestration:", error);
    }
  };

  return (
    <Container>
      {loading || !metadataLoaded ? (
        <MessageBox>Loading, please wait...</MessageBox>
      ) : isOutputSheet ? (
        <>
          <Heading>{heading}</Heading>
          <DropdownContainer>
            <CustomDropdown ref={dropdownRefs.saveStatus}>
              <DropdownButton 
                onClick={() => setDropdownOpen({ ...dropdownOpen, saveStatus: !dropdownOpen.saveStatus })}
                style={warnings.saveStatus ? { border: '1px solid red' } : {}}
              >
                {saveStatus || "Select Save Status"}
                <DropdownArrow>
                  <RiArrowDropDownLine size={24} />
                </DropdownArrow>
              </DropdownButton>
              {dropdownOpen.saveStatus && (
                <DropdownList>
                  {filteredSaveStatus.map((status, idx) => (
                    <DropdownItem key={idx} onClick={() => handleSelect("saveStatus", status)}>
                      {status}
                    </DropdownItem>
                  ))}
                </DropdownList>
              )}
            </CustomDropdown>

            <CustomDropdown ref={dropdownRefs.cycle}>
              <DropdownButton 
                onClick={() => setDropdownOpen({ ...dropdownOpen, cycle: !dropdownOpen.cycle })}
                style={warnings.cycle ? { border: '1px solid red' } : {}}
              >
                {selectedCycle || "Select Cycle"}
                <DropdownArrow>
                  <RiArrowDropDownLine size={24} />
                </DropdownArrow>
              </DropdownButton>
              {dropdownOpen.cycle && (
                <DropdownList>
                  {filteredCycles.map((cycle, idx) => (
                    <DropdownItem key={idx} onClick={() => handleSelect("cycle", cycle)}>
                      {cycle}
                    </DropdownItem>
                  ))}
                </DropdownList>
              )}
            </CustomDropdown>

            <CustomDropdown ref={dropdownRefs.scenario}>
              <DropdownButton 
                onClick={() => setDropdownOpen({ ...dropdownOpen, scenario: !dropdownOpen.scenario })}
                style={warnings.scenario ? { border: '1px solid red' } : {}}
              >
                {selectedScenario || "Select Scenario"}
                <DropdownArrow>
                  <RiArrowDropDownLine size={24} />
                </DropdownArrow>
              </DropdownButton>
              {dropdownOpen.scenario && (
                <DropdownList>
                  {filteredScenarios.map((scenario, idx) => (
                    <DropdownItem key={idx} onClick={() => handleSelect("scenario", scenario)}>
                      {scenario}
                    </DropdownItem>
                  ))}
                </DropdownList>
              )}
            </CustomDropdown>
          </DropdownContainer>

          <SaveButton onClick={handleImportClick}>Import Scenario</SaveButton>
        </>
      ) : (
        <MessageBox>No Authorized model detected, please refresh the add-in.</MessageBox>
      )}
    </Container>
  );
};

export default LoadScenario;