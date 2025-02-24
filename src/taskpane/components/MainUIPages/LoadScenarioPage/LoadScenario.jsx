import React, { useState, useEffect } from "react";
import {
  Container,
  Heading,
  MessageBox,
  DropdownContainer,
  SelectDropdown,
  SaveButton,
  WarningMessage,
} from "./Loadscenariostyles"; // Added WarningMessage style
import * as AWSconnections from "../../Middleware/AWSConnections";
import * as excelfunctions from "../../Middleware/ExcelConnection";

const LoadScenario = ({ setPageValue }) => {
  const [modelIDValue, setModelIDValue] = useState("");
  const [saveStatus, setSaveStatus] = useState(null);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [heading, setHeading] = useState("Active Sheet Name");
  const [isOutputSheet, setIsOutputSheet] = useState(false);
  const [loading, setLoading] = useState(true);

  const [warnings, setWarnings] = useState({
    saveStatus: false,
    cycle: false,
    scenario: false,
  });

  const [fullData, setFullData] = useState([]);
  const [filteredSaveStatus, setFilteredSaveStatus] = useState([]);
  const [filteredCycles, setFilteredCycles] = useState([]);
  const [filteredScenarios, setFilteredScenarios] = useState([]);

  useEffect(() => {
    const initSheet = async () => {
      await checkofCloudBackendSheet();
    };
    initSheet().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (modelIDValue) {
      setLoading(true);
      fetchDataFromLambda().finally(() => setLoading(false));
    }
  }, [modelIDValue]);

  const checkofCloudBackendSheet = async () => {
    try {
      console.log("📊 Checking for Output Sheet...");
      if (typeof window.Excel === "undefined") {
        console.error("🚨 Excel API is not available.");
        return;
      }
      await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        sheets.load("items/name");
        await context.sync();

        const MetaDataSheet = sheets.items.find((sheet) => sheet.name.toLowerCase() === "cloud_backend_md");

        if (MetaDataSheet) {
          const sheet = MetaDataSheet;
          const ModelName = sheet.getRange("B5");
          const ModelID = sheet.getRange("B7");
          ModelName.load("values");
          ModelID.load("values");
          await context.sync();

          const ModelNameValue = ModelName.values[0][0] || "";
          const ModelIDValue = ModelID.values[0][0] || "";

          setHeading(`Save Scenario for: ${ModelNameValue}`);
          setIsOutputSheet(true);
          setModelIDValue(ModelIDValue);

          console.log("✅ Model ID Fetched:", ModelIDValue);
        } else {
          console.log("⚠️ No Output Sheet Found.");
          setIsOutputSheet(false);
        }
      });
    } catch (error) {
      console.error("🚨 Error checking for Outputs sheet:", error);
      setIsOutputSheet(false);
    }
  };

  const fetchDataFromLambda = async () => {
    try {
      console.log("📤 Fetching Data from Lambda...");
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

      if (filteredData.length === 0) {
        console.warn("⚠️ No data found for Model ID:", modelIDValue);
        return;
      }

      console.log("🔍 Filtered Data:", filteredData);
      setFullData(filteredData);

      const uniqueSaveStatus = [...new Set(filteredData.map((row) => row.save_status).filter(Boolean))];
      const uniqueCycles = [...new Set(filteredData.map((row) => row.cycle_name).filter(Boolean))];
      const uniqueScenarios = [...new Set(filteredData.map((row) => row.scenario_name).filter(Boolean))];

      setFilteredSaveStatus(uniqueSaveStatus);
      setFilteredCycles(uniqueCycles);
      setFilteredScenarios(uniqueScenarios);
    } catch (error) {
      console.error("🚨 Error fetching data from Lambda:", error);
    }
  };

  const handleImportClick = async () => {
    let newWarnings = {
      saveStatus: !saveStatus,
      cycle: !selectedCycle,
      scenario: !selectedScenario,
    };
    setWarnings(newWarnings);

    if (!saveStatus || !selectedCycle || !selectedScenario) {
      console.warn("⚠️ User must select all dropdown values before importing.");
      return;
    }

    const forecastIdArray = fullData
      .filter(
        (row) =>
          row.save_status === saveStatus && row.cycle_name === selectedCycle && row.scenario_name === selectedScenario
      )
      .map((row) => row.forecast_id.replace("forecast_", "")); // Extract and trim forecast_id

    console.log("📌 Extracted Forecast IDs:", forecastIdArray);
    // forecastIdArray[0]= forecastIdArray[0]
    // forecastIdArray[0]="09374eab-e205-4f1b-8104-4e02aef9d907.xlsx";

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
        console.log(Downloadflag);

    if (SaveFlag === "Saved Forecast") {
      setPageValue("SaveForecastPageinterim");
    }
  };

  return (
    <Container>
      {loading ? (
        <MessageBox>Loading, please wait...</MessageBox>
      ) : isOutputSheet ? (
        <>
          <Heading>{heading}</Heading>
          <DropdownContainer>
            <SelectDropdown value={saveStatus || ""} onChange={(e) => setSaveStatus(e.target.value)}>
              <option value="" disabled>
                Select Save Status
              </option>
              {filteredSaveStatus.map((status, idx) => (
                <option key={idx} value={status}>
                  {status}
                </option>
              ))}
            </SelectDropdown>
            {warnings.saveStatus && <WarningMessage>Please select a Save Status</WarningMessage>}

            <SelectDropdown value={selectedCycle || ""} onChange={(e) => setSelectedCycle(e.target.value)}>
              <option value="" disabled>
                Select Cycle
              </option>
              {filteredCycles.map((cycle, idx) => (
                <option key={idx} value={cycle}>
                  {cycle}
                </option>
              ))}
            </SelectDropdown>
            {warnings.cycle && <WarningMessage>Please select a Cycle</WarningMessage>}

            <SelectDropdown value={selectedScenario || ""} onChange={(e) => setSelectedScenario(e.target.value)}>
              <option value="" disabled>
                Select Scenario
              </option>
              {filteredScenarios.map((scenario, idx) => (
                <option key={idx} value={scenario}>
                  {scenario}
                </option>
              ))}
            </SelectDropdown>
            {warnings.scenario && <WarningMessage>Please select a Scenario</WarningMessage>}
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
