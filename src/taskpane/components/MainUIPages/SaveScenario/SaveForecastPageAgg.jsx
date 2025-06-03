import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Heading,
  MessageBox,
  DropdownContainer,
  SelectDropdown,
  Input,
  SaveButton,
} from "./SaveForecastPageAggStyles";
import { DataFrame } from "dataframe-js";
import * as AWSconnections from "../../Middleware/AWSConnections";
import * as excelfucntions from "../../Middleware/ExcelConnection";
import { specialModelIds } from "../../Middleware/Model Config";
import CONFIG from "../../Middleware/AWSConnections";

const AggSaveScenario = ({ setPageValue }) => {
  // =============================================================================
  //                              STATE VARIABLES
  // =============================================================================
  const [selectedCycle, setSelectedCycle] = useState("");
  const [scenarioName, setScenarioName] = useState("");
  const [heading, setHeading] = useState("Active Sheet Name");
  const [isOutputSheet, setIsOutputSheet] = useState(false);
  const [modelIDError, setModelIDError] = useState("");

  const storedUsername = useMemo(() => sessionStorage.getItem("username"), []);
  const [cycleItems, setCycleItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modelIDValue, setModelIDValue] = useState("");
  const [modelType, setModelType] = useState("");
  const [cloudLoadModelsList, setCloudLoadModelsList] = useState([]);

  const [dataFrames, setDataFrames] = useState({
    dfResult1: null,
    dfResult2: null,
    dfResult3: null,
  });

  // Duplicate scenario set
  const scenarioSet = useMemo(() => {
    const df = dataFrames.dfResult1;
    if (!df) return new Set();
    return new Set(
      df.toCollection().map((r) => {
        const id = (r.model_id ?? "").toString().trim();
        const cycle = (r.cycle_name ?? "").toString().trim();
        const scen = (r.scenario_name ?? "").toString().trim().toLowerCase();
        return `${id}|${cycle}|${scen}`;
      })
    );
  }, [dataFrames.dfResult1]);

  const checkScenarioExists = useCallback(
    (modelId, cycleName, scenarioName) => {
      if (!dataFrames.dfResult1) return false;
      const key = `${modelId}|${cycleName}|${scenarioName.trim().toLowerCase()}`;
      return scenarioSet.has(key);
    },
    [scenarioSet]
  );

  // Excel sheet check
  const checkofCloudBackendSheet = useCallback(async () => {
    try {
      if (typeof window.Excel === "undefined") return;
      await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        sheets.load("items/name");
        await context.sync();

        const MetaDataSheet = sheets.items.find(
          (sheet) => sheet.name.toLowerCase() === "cloud_backend_md"
        );

        if (!MetaDataSheet) {
          setIsOutputSheet(false);
          return;
        }

        const ranges = {
          ModelName: MetaDataSheet.getRange("B5"),
          ModelID: MetaDataSheet.getRange("B7"),
          ModelType: MetaDataSheet.getRange("B8"),
        };
        Object.values(ranges).forEach((r) => r.load("values"));

        const cloudLoadModelsName = context.workbook.names.getItem(
          "Cloud_LoadModels_List"
        );
        const cloudLoadModelsRange = cloudLoadModelsName.getRange();
        cloudLoadModelsRange.load("values");

        await context.sync();

        const nameVal = (ranges.ModelName.values[0][0] ?? "").toString().trim();
        const idVal = (ranges.ModelID.values[0][0] ?? "").toString().trim();
        const typeVal = (ranges.ModelType.values[0][0] ?? "").toString().trim();
        const loadedList = cloudLoadModelsRange.values;

        setHeading(`Save Aggregator Scenario for: ${nameVal}`);
        setModelIDValue(idVal);
        setModelType(typeVal);
        setCloudLoadModelsList(loadedList);
        setIsOutputSheet(true);
      });
    } catch (error) {
      console.error(error);
      setIsOutputSheet(false);
    }
  }, []);

  // Lambda fetch
  const fetchDataFromLambda = useCallback(async () => {
    try {
      const resp = await AWSconnections.FetchMetaData(
        "FETCH_METADATA",
        localStorage.getItem("idToken"),
        CONFIG.AWS_SECRETS_NAME,
        localStorage.getItem("User_ID"),
        localStorage.getItem("username")
      );
      if (!resp || !resp.results1 || !resp.results2 || !resp.result3) {
        throw new Error();
      }
      const df1 = new DataFrame(resp.results1);
      const df2 = new DataFrame(resp.results2);
      const df3 = new DataFrame(resp.result3);
      setDataFrames({ dfResult1: df1, dfResult2: df2, dfResult3: df3 });
      setCycleItems(df2.distinct("cycle_name").toArray().map((r) => r[0]));
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([checkofCloudBackendSheet(), fetchDataFromLambda()]);
      setLoading(false);
    })();
  }, [checkofCloudBackendSheet, fetchDataFromLambda]);

  // Model ID auth
  useEffect(() => {
    if (!loading && modelIDValue && dataFrames.dfResult3) {
      const authorized = dataFrames.dfResult3.toCollection().some((m) => (m.model_id ?? "").toString() === modelIDValue);
      if (!authorized) {
        setModelIDError("Model ID mismatch. The current model is not authorized.");
        setIsOutputSheet(false);
      } else {
        setModelIDError("");
      }
    }
  }, [loading, modelIDValue, dataFrames.dfResult3]);

  // Save handler
  const handleSaveClick = useCallback(async () => {
    console.time("Total save time request");
    setPageValue("LoadingCircleComponent", "0% | Checking Access...");

    const access = await AWSconnections.ButtonAccess("SAVE_FORECAST");
    if (access?.message === "ACCESS DENIED") {
      setPageValue("SaveForecastPageinterim", "You do not have permission to save forecast.");
      console.timeEnd("Total save time request");
      return;
    }

    if (checkScenarioExists(modelIDValue, selectedCycle, scenarioName)) {
      setPageValue("SaveForecastPageinterim", "Scenario names already exist in the database. Please choose a different scenario name.");
      console.timeEnd("Total save time request");
      return;
    }
    if (
      Array.isArray(cloudLoadModelsList) &&
      cloudLoadModelsList.some(row => row[1] !== selectedCycle)
    ) {
      setPageValue(
        "SaveForecastPageinterim",
        "Selected cycle doesn’t match with the indication models. Please select the correct indication models to proceed with saving the aggregated forecast."
      );
      console.timeEnd("Total save time request");
      return;
    }


    const allSynced = cloudLoadModelsList.every(row => {
      const val = row[7];

      // if it’s explicitly false, fail immediately
      if (val === false) {
        return false;
      }

      // if it’s explicitly true, that row passes
      if (val === true) {
        return true;
      }

      // anything else (empty, null, undefined, non-boolean) → ignore (treat as “pass”)
      return true;
    });

    if (!allSynced) {
      setPageValue(
        "SaveForecastPageinterim",
        "All Indication Models are not Synced, please load models before saving"
      );
      console.timeEnd("Total save time request");
      return;
    }

    let concatenatedArray;
    // Concatenate column 1 and column 7 from cloudLoadModelsList with a hyphen in between.
    if (cloudLoadModelsList && cloudLoadModelsList.length > 0) {
      concatenatedArray = cloudLoadModelsList.map((row) => {
        // Assuming the named range returns a 2D array and using 1-indexed columns:
        // Column 1 -> index 0 and Column 7 -> index 6.
        if (row.length >= 7) {
          return `${row[0]} - ${row[6]}`;
        }
        return "";
      });
      console.log("Concatenated Columns (1 & 7):", concatenatedArray);
    } else {
      console.log("No Cloud_LoadModels_List data available.");
    }
    try {
      await excelfucntions.setCalculationMode("manual");
      setPageValue("LoadingCircleComponent", "0% | Saving your forecast...");

      // Data preparation
      const longformData = await excelfucntions.generateLongFormData("US", "DataModel");
      await excelfucntions.saveData();

      setPageValue("LoadingCircleComponent", "75% | Saving your forecast...");
      const saveFlag = await AWSconnections.service_orchestration(
        "SAVE_FORECAST_AGG",
        "",
        modelIDValue,
        scenarioName,
        selectedCycle,
        "",
        "",
        "",
        longformData,
        "",
        "",
        concatenatedArray,
        [],
        setPageValue
      );
      // Success, Error, and catch-all handling
      if (saveFlag === "SUCCESS" || (saveFlag && saveFlag.result === "DONE")) {
        const message = `Forecast scenario saved for\nModel: ${heading.replace("Save Aggregator Scenario for: ", "")}\nCycle: ${selectedCycle}\nScenario: ${scenarioName}`;
        setPageValue("SaveForecastPageinterim", message);
      } else {
        setPageValue("SaveForecastPageinterim", "Some error occurred while saving, please try again");
      }
    } catch (error) {
      console.error(error);
      setPageValue("SaveForecastPageinterim", "Some error occurred while saving, please try again");
    } finally {
      console.timeEnd("Total save time request");
    }
  }, [modelIDValue, selectedCycle, scenarioName, checkScenarioExists, setPageValue, heading, cloudLoadModelsList]);

  // Render
  if (loading) return <MessageBox>Checking cloud compatibility, please wait...</MessageBox>;
  if (modelIDError) return <MessageBox>{modelIDError}</MessageBox>;
  if (!isOutputSheet) return <MessageBox>No authorized model detected. Please refresh the add-in.</MessageBox>;

  const isDisabled = !selectedCycle || !scenarioName;
  return (
    <Container>
      <Heading>{heading}</Heading>
      <DropdownContainer>
        <SelectDropdown value={selectedCycle} onChange={(e) => setSelectedCycle(e.target.value)}>
          <option value="" disabled>Select Cycle</option>
          {cycleItems.length > 0 ? cycleItems.map((item, idx) => <option key={idx} value={item}>{item}</option>) : <option disabled>No Cycles Available</option>}
        </SelectDropdown>
        <Input type="text" placeholder="Enter Scenario Name" value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} />
      </DropdownContainer>
      <SaveButton onClick={handleSaveClick} disabled={isDisabled} style={isDisabled ? { backgroundColor: "#ccc", cursor: "not-allowed" } : {}}>Save</SaveButton>
    </Container>
  );
};

export default AggSaveScenario;
