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
import * as excelconnections from "../../Middleware/ExcelConnection";
import CONFIG from "../../Middleware/AWSConnections";
import { config } from "process";

const LoadScenario = ({ setPageValue }) => {
  const [modelIDValue, setModelIDValue] = useState("");
  const [saveStatus, setSaveStatus] = useState(null);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [heading, setHeading] = useState("Active Sheet Name");
  const [isOutputSheet, setIsOutputSheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metadataLoaded, setMetadataLoaded] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

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

  // Fetch data for import functionality but use fixed dropdown values
  useEffect(() => {
    if (modelIDValue) {
      fetchDataFromLambda();
    }
  }, [modelIDValue]);

  // Set fixed dropdown values
  useEffect(() => {
    setFilteredSaveStatus(["Locked", "Interim", "Interim + BI"]);
    setFilteredCycles(["LRP 25", "LRP 26", "Custom 1", "Custom 2"]);
    setFilteredScenarios(["Scenario 1", "Scenario 2", "Scenario 3"]);
  }, []);

  const checkofCloudBackendSheet = async () => {
    try {
      if (typeof window.Excel === "undefined") {
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
        } else {
          setIsOutputSheet(false);
        }
        setLoading(false);
      });
    } catch (error) {
      console.error("Error checking sheet:", error);
      setIsOutputSheet(false);
      setLoading(false);
    }
  };

  const fetchDataFromLambda = async () => {
    try {
      setMetadataLoaded(false);
      const responseBody = await AWSconnections.FetchMetaData(
        "FETCH_METADATA",
        localStorage.getItem("idToken"),
        CONFIG.AWS_SECRETS_NAME,
        localStorage.getItem("User_ID"),
        localStorage.getItem("username")
      );

      if (!responseBody || !responseBody.results1) {
        throw new Error("No results1 found");
      }

      const filteredData = responseBody.results1.filter((row) => row.model_id === modelIDValue);
      setFullData(filteredData);

      setMetadataLoaded(true);
    } catch (error) {
      console.error("Error fetching metadata:", error);
      setMetadataLoaded(true);
    }
  };

  const handleSelect = (key, value) => {
    if (key === "saveStatus") {
      setSaveStatus(value);
      const filteredBySaveStatus = fullData.filter(row => row.save_status === value);
      const availableCycles = [...new Set(filteredBySaveStatus.map(row => row.cycle_name))];
      const availableScenarios = [...new Set(filteredBySaveStatus.map(row => row.scenario_name))];
      if (!availableCycles.includes(selectedCycle)) setSelectedCycle(null);
      if (!availableScenarios.includes(selectedScenario)) setSelectedScenario(null);
    }

    if (key === "cycle") {
      setSelectedCycle(value);
      const filteredByCycle = fullData.filter(row =>
        (!saveStatus || row.save_status === saveStatus) && row.cycle_name === value
      );
      const availableScenarios = [...new Set(filteredByCycle.map(row => row.scenario_name))];
      if (!availableScenarios.includes(selectedScenario)) setSelectedScenario(null);
    }

    if (key === "scenario") {
      setSelectedScenario(value);
    }

    setDropdownOpen((prev) => ({ ...prev, [key]: false }));
  };

  const handleImportClick = async () => {
    console.log("Import button clicked");
    console.log("Selected values:", { saveStatus, selectedCycle, selectedScenario });

    const newWarnings = {
      saveStatus: !saveStatus,
      cycle: !selectedCycle,
      scenario: !selectedScenario,
    };
    setWarnings(newWarnings);

    if (!saveStatus || !selectedCycle || !selectedScenario) {
      console.log("Missing required selections");
      return;
    }

    // Simulated 20-second progress instead of AWS calls
    const steps = [
      { pct: 0, label: "Starting import...", delay: 0 },
      { pct: 15, label: "Importing scenario...", delay: 4000 },
      { pct: 35, label: "Importing assumptions...", delay: 4000 },
      { pct: 55, label: "Processing data...", delay: 4000 },
      { pct: 75, label: "Applying changes...", delay: 4000 },
      { pct: 100, label: "Import completed", delay: 4000 },
    ];

    for (const step of steps) {
      if (step.delay > 0) await new Promise((resolve) => setTimeout(resolve, step.delay));
      setImportProgress(step.pct);
      setPageValue("LoadingCircleComponent", `${step.pct}% | ${step.label}`);
    }

    // Show success message
    const modelNameOnly = heading.replace("Import Scenario for: ", "");
    const message = [
      `Forecast scenario imported for:`,
      `Model: ${modelNameOnly}`,
      `Cycle: ${selectedCycle}`,
      `Scenario: ${selectedScenario}`,
    ].join("\n");
    setPageValue("SuccessMessagePage", message);
  };

  return (
    <Container>
      {loading || !metadataLoaded ? (
        <MessageBox>Connecting to data lake, please wait…</MessageBox>
      ) : isOutputSheet ? (
        <>
          <Heading>{heading}</Heading>
          <DropdownContainer>
            {["saveStatus", "cycle", "scenario"].map((key) => (
              <CustomDropdown key={key} ref={dropdownRefs[key]}>
                <DropdownButton
                  onClick={() => setDropdownOpen({ ...dropdownOpen, [key]: !dropdownOpen[key] })}
                  style={warnings[key] ? { border: "1px solid red" } : {}}
                >
                  {{
                    saveStatus: saveStatus || "Select Save Status",
                    cycle: selectedCycle || "Select Cycle",
                    scenario: selectedScenario || "Select Scenario",
                  }[key]}
                  <DropdownArrow>
                    <RiArrowDropDownLine size={24} />
                  </DropdownArrow>
                </DropdownButton>
                {dropdownOpen[key] && (
                  <DropdownList>
                    {{
                      saveStatus: filteredSaveStatus,
                      cycle: filteredCycles,
                      scenario: filteredScenarios,
                    }[key].map((item, idx) => (
                      <DropdownItem key={idx} onClick={() => handleSelect(key, item)}>
                        {item}
                      </DropdownItem>
                    ))}
                  </DropdownList>
                )}
              </CustomDropdown>
            ))}
          </DropdownContainer>
          <SaveButton onClick={handleImportClick}>Import Scenario</SaveButton>
        </>
      ) : (
        <MessageBox>Current workbook is not a compatible forecast model. Please open the latest ADC models to use this feature.</MessageBox>
      )}
    </Container>
  );
};

export default LoadScenario;
