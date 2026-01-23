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

  useEffect(() => {
    if (modelIDValue) {
      fetchDataFromLambda();
    }
  }, [modelIDValue]);

  useEffect(() => {
    if (fullData.length > 0) {
      updateDropdownOptions();
    }
  }, [saveStatus, selectedCycle, selectedScenario, fullData]);

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

        const MetaDataSheet = sheets.items.find((sheet) => sheet.name.toLowerCase() === "cloud_backend_md");

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

      setFilteredSaveStatus([...new Set(filteredData.map((row) => row.save_status).filter(Boolean))]);
      setFilteredCycles([...new Set(filteredData.map((row) => row.cycle_name).filter(Boolean))]);
      setFilteredScenarios([...new Set(filteredData.map((row) => row.scenario_name).filter(Boolean))]);

      setMetadataLoaded(true);
    } catch (error) {
      console.error("Error fetching metadata:", error);
      setMetadataLoaded(true);
    }
  };

  const updateDropdownOptions = () => {
    let filteredData = [...fullData];

    if (saveStatus) filteredData = filteredData.filter((row) => row.save_status === saveStatus);
    if (selectedCycle) filteredData = filteredData.filter((row) => row.cycle_name === selectedCycle);
    if (selectedScenario) filteredData = filteredData.filter((row) => row.scenario_name === selectedScenario);

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
    if (key === "saveStatus") {
      setSaveStatus(value);
      const filteredBySaveStatus = fullData.filter((row) => row.save_status === value);
      const availableCycles = [...new Set(filteredBySaveStatus.map((row) => row.cycle_name))];
      const availableScenarios = [...new Set(filteredBySaveStatus.map((row) => row.scenario_name))];
      if (!availableCycles.includes(selectedCycle)) setSelectedCycle(null);
      if (!availableScenarios.includes(selectedScenario)) setSelectedScenario(null);
    }

    if (key === "cycle") {
      setSelectedCycle(value);
      const filteredByCycle = fullData.filter(
        (row) => (!saveStatus || row.save_status === saveStatus) && row.cycle_name === value
      );
      const availableScenarios = [...new Set(filteredByCycle.map((row) => row.scenario_name))];
      if (!availableScenarios.includes(selectedScenario)) setSelectedScenario(null);
    }

    if (key === "scenario") {
      setSelectedScenario(value);
    }

    setDropdownOpen((prev) => ({ ...prev, [key]: false }));
  };

  const increaseProgressDuringExport = async () => {
    for (let i = 55; i <= 95; i += 5) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setImportProgress(i);
      setPageValue("LoadingCircleComponent", `${i}% | Importing assumptions...`);
    }
  };

  const handleImportClick = async () => {
    const newWarnings = {
      saveStatus: !saveStatus,
      cycle: !selectedCycle,
      scenario: !selectedScenario,
    };
    setWarnings(newWarnings);
    if (!saveStatus || !selectedCycle || !selectedScenario) return;

    const forecastIdArray = fullData
      .filter(
        (row) =>
          row.save_status === saveStatus && row.cycle_name === selectedCycle && row.scenario_name === selectedScenario
      )
      .map((row) => row.forecast_id.replace("forecast_", ""));

    if (forecastIdArray.length === 0) return;

    // Step 1: Simulate 0–50% progress
    setImportProgress(0);
    for (let i = 0; i <= 50; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setPageValue("LoadingCircleComponent", `${i}% | Importing scenario...`);
      setImportProgress(i);
    }
    excelconnections.setCalculationMode("manual");
    try {
      const Downloadflag = await AWSconnections.service_orchestration(
        "IMPORT_ASSUMPTIONS",
        "",
        modelIDValue,
        selectedScenario,
        selectedCycle,
        "",
        "",
        forecastIdArray
      );

      if (Downloadflag && Downloadflag.status === "Scenario Imported") {
        // Step 2: Update message and begin increasing progress
        setPageValue("LoadingCircleComponent", "55% | Importing assumptions...");
        setImportProgress(55);
        excelconnections.setCalculationMode("manual");

        const progressPromise = increaseProgressDuringExport();

        await excelconnections.exportData2();

        await progressPromise;

        await AWSconnections.writeMetadataToNamedCell("last_scn_update", selectedCycle, selectedScenario, saveStatus);
        
        // Submit model forecast notes and get changelog data
        console.log("📤 Fetching forecast changelog for model:", modelIDValue);
        const notesSubmissionResponse = await AWSconnections.submitModelForecastNotes(modelIDValue, "");
        console.log("Notes submission response:", notesSubmissionResponse);

        // Write changelog to Excel if successful
        if (notesSubmissionResponse.status === "success" && notesSubmissionResponse.data) {
          const changelogResult = await AWSconnections.writeForecastChangelogToExcel(notesSubmissionResponse.data);
          console.log("Changelog write result:", changelogResult);
        } else {
          console.warn("⚠️ Failed to fetch changelog data:", notesSubmissionResponse.message);
        }

        /// scenario level notes

        console.log("📤 Fetching forecast changelog for model:", modelIDValue);
        const notesSubmissionResponse1 = await AWSconnections.submitModelForecastNotes(modelIDValue, `forecast_${forecastIdArray[0]}`);
        console.log("Notes submission response:", notesSubmissionResponse1);

        // Transform and write scenario-level notes to Excel
        if (notesSubmissionResponse1.status === "success" && notesSubmissionResponse1.data?.forecasts?.length > 0) {
          const forecast = notesSubmissionResponse1.data.forecasts[0];
          
          // Format timestamp to readable date
          const formatDate = (timestamp) => {
            if (!timestamp) return "";
            const date = new Date(timestamp);
            return date.toLocaleDateString('en-US');
          };

          // Transform response to match writeForecastNotesToExcel format
          const transformedData = {
            basic_details: {
              cycle_name: forecast.cycle_name || "",
              status: forecast.save_status || "",
              scenario_name: forecast.scenario_name || "",
              saved_at: formatDate(forecast.forecast_generation_timestamp),
              loaded_at: new Date().toLocaleDateString('en-US'),
              owner: `${forecast.first_name || ""} ${forecast.last_name || ""}`.trim()
            },
            forecaster_notes: forecast.forecaster_notes || "",
            detailed_notes: {
              epidemiology: forecast.epidemiology || "",
              market_share: forecast.market_share_assumptions || "",
              patient_conversion: forecast.patient_conversion || "",
              demand_conversion: forecast.demand_conversion || "",
              revenue_conversion: forecast.revenue_conversion || ""
            }
          };

          const writeResult = await AWSconnections.writeForecastNotesToExcel(transformedData);
          console.log("Scenario notes write result:", writeResult);
        } else {
          console.warn("⚠️ Failed to fetch scenario-level notes:", notesSubmissionResponse1.message);
        }

        // end of scenario level notes --------------------

        //---------------------
        // Step 3: Complete at 100%
        setImportProgress(100);
        setPageValue("LoadingCircleComponent", "100% | Import completed");

        const modelNameOnly = heading.replace("Import Scenario for: ", "");
        const message = [
          `Forecast scenario imported for:`,
          `Model: ${modelNameOnly}`,
          `Cycle: ${selectedCycle}`,
          `Scenario: ${selectedScenario}`,
        ].join("\n");
        setPageValue("SuccessMessagePage", message);
        excelconnections.setCalculationMode("automatic");
      } else {
        console.error("Scenario Import Failed:", Downloadflag);
      }
    } catch (error) {
      console.error("Error during import:", error);
    }
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
                  {
                    {
                      saveStatus: saveStatus || "Select Save Status",
                      cycle: selectedCycle || "Select Cycle",
                      scenario: selectedScenario || "Select Scenario",
                    }[key]
                  }
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
        <MessageBox>
          Current workbook is not a compatible forecast model. Please open the latest ADC models to use this feature.
        </MessageBox>
      )}
    </Container>
  );
};

export default LoadScenario;
