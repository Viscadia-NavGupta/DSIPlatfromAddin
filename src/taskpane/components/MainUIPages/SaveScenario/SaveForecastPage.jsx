import React, {
  useState,
  useEffect,
  useCallback,
  useMemo
} from "react";
import {
  Container,
  Heading,
  MessageBox,
  DropdownContainer,
  SelectDropdown,
  Input,
  SaveButton,
} from "./SaveForecastPageStyles";
import { DataFrame } from "dataframe-js";
import * as AWSconnections from "../../Middleware/AWSConnections";
import * as excelfucntions from "../../Middleware/ExcelConnection";
import CONFIG from "../../Middleware/AWSConnections";

const SaveScenario = ({ setPageValue }) => {
  const [selectedCycle, setSelectedCycle] = useState("");
  const [scenarioName, setScenarioName] = useState("");
  const [heading, setHeading] = useState("Active Sheet Name");
  const [isOutputSheet, setIsOutputSheet] = useState(false);
  const [cycleItems, setCycleItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modelIDValue, setModelIDValue] = useState("");
  const [modelType, setModelType] = useState("");
  const [modelIDError, setModelIDError] = useState("");

  const [dataFrames, setDataFrames] = useState({
    dfResult1: null,
    dfResult2: null,
    dfResult3: null,
  });

  // ────────────────────────────────────────────────────────────────
  // Build a Set of normalized keys once dfResult1 loads
  // ────────────────────────────────────────────────────────────────
  const scenarioSet = useMemo(() => {
    const df = dataFrames.dfResult1;
    if (!df) return new Set();

    return new Set(
      df
        .toCollection()
        .map((r) => {
          const id = (r.model_id ?? "").toString().trim();
          const cycle = (r.cycle_name ?? "").toString().trim();
          const scen = (r.scenario_name ?? "").toString().trim().toLowerCase();
          return `${id}|${cycle}|${scen}`;
        })
    );
  }, [dataFrames.dfResult1]);

  // ────────────────────────────────────────────────────────────────
  // Fast existence check
  // ────────────────────────────────────────────────────────────────
  const checkScenarioExists = useCallback(
    (modelId, cycleName, scenarioName) => {
      if (!dataFrames.dfResult1) {
        console.warn("Result1 DataFrame is not loaded yet.");
        return false;
      }
      const id = (modelId ?? "").toString().trim();
      const cycle = (cycleName ?? "").toString().trim();
      const scen = scenarioName.trim().toLowerCase();
      const key = `${id}|${cycle}|${scen}`;
      return scenarioSet.has(key);
    },
    [dataFrames.dfResult1, scenarioSet]
  );

  // ────────────────────────────────────────────────────────────────
  // Read Excel to set ModelName, ModelID, ModelType
  // ────────────────────────────────────────────────────────────────
  const checkofCloudBackendSheet = useCallback(async () => {
    try {
      if (typeof window.Excel === "undefined") return;

      await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        sheets.load("items/name");
        await context.sync();

        const mdSheet = sheets.items.find(
          (s) => s.name.toLowerCase() === "cloud_backend_md"
        );
        if (!mdSheet) {
          setIsOutputSheet(false);
          return;
        }

        const ranges = {
          ModelName: mdSheet.getRange("B5"),
          ModelID: mdSheet.getRange("B7"),
          ModelType: mdSheet.getRange("B8"),
        };
        Object.values(ranges).forEach((r) => r.load("values"));
        await context.sync();

        const nameVal = (ranges.ModelName.values[0][0] ?? "")
          .toString()
          .trim();
        const idVal = (ranges.ModelID.values[0][0] ?? "").toString().trim();
        const typeVal = (ranges.ModelType.values[0][0] ?? "")
          .toString()
          .trim();

        if (!nameVal || !idVal || !typeVal) {
          console.warn("One or more required model values are blank.");
          setIsOutputSheet(false);
          return;
        }

        setHeading(`Save Scenario for: ${nameVal}`);
        setModelIDValue(idVal);
        setModelType(typeVal);
        setIsOutputSheet(true);

        if (typeVal === "AGGREGATOR") {
          setPageValue(
            "AggSaveScenario",
            "Loading scenario for Aggregator model..."
          );
        }
      });
    } catch (error) {
      console.error("Error checking for Outputs sheet:", error);
      setIsOutputSheet(false);
    }
  }, [setPageValue]);

  // ────────────────────────────────────────────────────────────────
  // Fetch DataFrames from Lambda
  // ────────────────────────────────────────────────────────────────
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
        throw new Error("Missing one or more required results.");
      }

      const df1 = new DataFrame(resp.results1);
      const df2 = new DataFrame(resp.results2);
      const df3 = new DataFrame(resp.result3);
      setDataFrames({ dfResult1: df1, dfResult2: df2, dfResult3: df3 });

      const cycles = df2
        .distinct("cycle_name")
        .toArray()
        .map((row) => row[0]);
      setCycleItems(cycles);
    } catch (error) {
      console.error("Error fetching data from Lambda:", error);
    }
  }, []);

  // ────────────────────────────────────────────────────────────────
  // Initialize on mount
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          checkofCloudBackendSheet(),
          fetchDataFromLambda(),
        ]);
      } catch (e) {
        console.error("Initialization failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [checkofCloudBackendSheet, fetchDataFromLambda]);

  // ────────────────────────────────────────────────────────────────
  // Authorize modelID against dfResult3
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && modelIDValue && dataFrames.dfResult3) {
      const authorized = dataFrames.dfResult3
        .toCollection()
        .some((m) => (m.model_id ?? "").toString() === modelIDValue);
      if (!authorized) {
        setModelIDError(
          "Model ID mismatch. The current model is not authorized."
        );
        setIsOutputSheet(false);
      } else {
        setModelIDError("");
      }
    }
  }, [loading, modelIDValue, dataFrames.dfResult3]);

  // ────────────────────────────────────────────────────────────────
  // Save button handler
  // ────────────────────────────────────────────────────────────────
  const handleSaveClick = useCallback(async () => {
    console.time("Total save time request");
    setPageValue("LoadingCircleComponent", "0% | Checking Access...");

    const access = await AWSconnections.ButtonAccess("SAVE_FORECAST");
    if (access?.message === "ACCESS DENIED") {
      setPageValue(
        "SaveForecastPageinterim",
        "You do not have permission to save forecast."
      );
      console.timeEnd("Total save time request");
      return;
    }

    if (
      checkScenarioExists(modelIDValue, selectedCycle, scenarioName)
    ) {
      setPageValue(
        "SaveForecastPageinterim",
        "Scenario names already exist… choose a different one."
      );
      return;
    }

    try {
      await excelfucntions.setCalculationMode("manual");
      setPageValue("LoadingCircleComponent", "0% | Saving your forecast...");
      const [longformData, , outputbackend_data] = await Promise.all([
        excelfucntions.generateLongFormData("US", "DataModel"),
        excelfucntions.saveData(),
        excelfucntions.readNamedRangeToArray("aggregator_data"),
      ]);

      setPageValue("LoadingCircleComponent", "75% | Saving your forecast...");
      const saveFlag = await AWSconnections.service_orchestration(
        "SAVE_FORECAST",
        "",
        modelIDValue,
        scenarioName,
        selectedCycle,
        "",
        "",
        "",
        longformData,
        outputbackend_data,
        [],
        [],
        [],
        setPageValue
      );

      const message = `Forecast scenario saved for
Model: ${heading.replace("Save Scenario for:", "")}
Cycle: ${selectedCycle}
Scenario: ${scenarioName}`;

      if (
        saveFlag === "SUCCESS" ||
        (saveFlag && saveFlag.result === "DONE")
      ) {
        setPageValue("SaveForecastPageinterim", message);
      } else {
        setPageValue(
          "SaveForecastPageinterim",
          "Some Error Occurred, Please try again"
        );
      }
    } catch (error) {
      console.error("Error during save process:", error);
      setPageValue(
        "SaveForecastPageinterim",
        "An error occurred during save"
      );
    } finally {
      console.timeEnd("Total save time request");
    }
  }, [
    modelIDValue,
    selectedCycle,
    scenarioName,
    checkScenarioExists,
    setPageValue,
    heading,
  ]);

  // ────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────
  if (loading) {
    return <MessageBox>Checking cloud compatibility, please wait...</MessageBox>;
  }
  if (modelIDError) {
    return <MessageBox>{modelIDError}</MessageBox>;
  }
  if (!isOutputSheet) {
    return (
      <MessageBox>
        No authorized model found. Please refresh the add-in.
      </MessageBox>
    );
  }

  return (
    <Container>
      <Heading>{heading}</Heading>
      <DropdownContainer>
        <SelectDropdown
          value={selectedCycle}
          onChange={(e) => setSelectedCycle(e.target.value)}
        >
          <option value="" disabled>
            Select Cycle
          </option>
          {cycleItems.map((c, i) => (
            <option key={i} value={c}>
              {c}
            </option>
          ))}
        </SelectDropdown>
        <Input
          type="text"
          placeholder="Enter Scenario Name"
          value={scenarioName}
          onChange={(e) => setScenarioName(e.target.value)}
        />
      </DropdownContainer>
      <SaveButton
        onClick={handleSaveClick}
        disabled={!selectedCycle || !scenarioName}
      >
        Save
      </SaveButton>
    </Container>
  );
};

export default SaveScenario;
