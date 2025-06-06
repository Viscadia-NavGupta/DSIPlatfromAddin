// src/pages/SaveandLockScenario.jsx

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Container,
  Heading,
  MessageBox,
  DropdownContainer,
  SelectDropdown,
  Input,
  SaveButton,
  Overlay,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ConfirmButton,
} from "./SaveandLockPageStyles";
import { DataFrame } from "dataframe-js";
import * as AWSconnections from "../../Middleware/AWSConnections";
import * as excelfucntions from "../../Middleware/ExcelConnection";
import { specialModelIds } from "../../Middleware/Model Config";
import CONFIG from "../../Middleware/AWSConnections";

const SaveandLockScenario = ({ setPageValue }) => {
  const [selectedCycle, setSelectedCycle] = useState("");
  const [scenarioName, setScenarioName] = useState("");
  const [heading, setHeading] = useState("Active Sheet Name");
  const [isOutputSheet, setIsOutputSheet] = useState(false);
  const [cycleItems, setCycleItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modelIDValue, setModelIDValue] = useState("");
  const [modelType, setModelType] = useState("");
  const [modelIDError, setModelIDError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const [dataFrames, setDataFrames] = useState({
    dfResult1: null,
    dfResult2: null,
    dfResult3: null,
  });

  // Build a Set of existing (modelId|cycle|scenario) keys
  const scenarioSet = useMemo(() => {
    const df = dataFrames.dfResult1;
    if (!df) return new Set();
    return new Set(
      df
        .toCollection()
        .map((r) => {
          const id = (r.model_id ?? "").toString().trim();
          const cycle = (r.cycle_name ?? "").toString().trim();
          const scen = (r.scenario_name ?? "")
            .toString()
            .trim()
            .toLowerCase();
          return `${id}|${cycle}|${scen}`;
        })
    );
  }, [dataFrames.dfResult1]);

  const checkScenarioExists = useCallback(
    (modelId, cycleName, scenarioName) => {
      if (!dataFrames.dfResult1) return false;
      const key = `${modelId}|${cycleName}|${scenarioName
        .trim()
        .toLowerCase()}`;
      return scenarioSet.has(key);
    },
    [dataFrames.dfResult1, scenarioSet]
  );

  // Read “CloudBackend” sheet from Excel to set heading, modelID, modelType
  const checkofCloudBackendSheet = useCallback(
    async () => {
      try {
        if (!window.Excel) return;
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
          const idVal = (ranges.ModelID.values[0][0] ?? "")
            .toString()
            .trim();
          const typeVal = (ranges.ModelType.values[0][0] ?? "")
            .toString()
            .trim();

          if (!nameVal || !idVal || !typeVal) {
            setIsOutputSheet(false);
            return;
          }

          setHeading(`Save & Lock Scenario for: ${nameVal}`);
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
        console.error("Error checking Outputs sheet:", error);
        setIsOutputSheet(false);
      }
    },
    [setPageValue]
  );

  // Fetch metadata from Lambda and populate dataFrames & cycleItems
  const fetchDataFromLambda = useCallback(async () => {
    try {
      const resp = await AWSconnections.FetchMetaData(
        "FETCH_METADATA",
        localStorage.getItem("idToken"),
        CONFIG.AWS_SECRETS_NAME,
        localStorage.getItem("User_ID"),
        localStorage.getItem("username")
      );
      if (!resp?.results1 || !resp?.results2 || !resp?.result3) {
        throw new Error("Missing one or more required results.");
      }
      setDataFrames({
        dfResult1: new DataFrame(resp.results1),
        dfResult2: new DataFrame(resp.results2),
        dfResult3: new DataFrame(resp.result3),
      });
      const cycles = new DataFrame(resp.results2)
        .distinct("cycle_name")
        .toArray()
        .map((r) => r[0]);
      setCycleItems(cycles);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, []);

  // On mount: run both checks, then clear loading
  useEffect(() => {
    (async () => {
      try {
        await Promise.all([checkofCloudBackendSheet(), fetchDataFromLambda()]);
      } catch (e) {
        console.error("Initialization failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [checkofCloudBackendSheet, fetchDataFromLambda]);

  // After data loads, verify modelIDValue is allowed
  useEffect(() => {
    if (!loading && modelIDValue && dataFrames.dfResult3) {
      const allowed = dataFrames.dfResult3
        .toCollection()
        .some((m) => (m.model_id ?? "").toString() === modelIDValue);
      if (!allowed) {
        setModelIDError(
          "Model ID mismatch. The current model is not authorized."
        );
        setIsOutputSheet(false);
      } else {
        setModelIDError("");
      }
    }
  }, [loading, modelIDValue, dataFrames.dfResult3]);

  // Show the confirmation modal
  const handleSaveClick = useCallback(() => {
    setShowConfirm(true);
  }, []);

  // User confirmed “Yes” → save + lock logic
  const handleSaveConfirmed = useCallback(async () => {
    setShowConfirm(false);
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

    if (checkScenarioExists(modelIDValue, selectedCycle, scenarioName)) {
      setPageValue(
        "SaveForecastPageinterim",
        "Scenario names already exist… choose a different one."
      );
      return;
    }

    try {
      // Switch Excel to Manual calc
      await excelfucntions.setCalculationMode("manual");
      setPageValue("LoadingCircleComponent", "0% | Saving your forecast...");

      let longformData;
      let outputbackend_data = [];

      if (specialModelIds.includes(modelIDValue)) {
        // Special‐model flow: generate long form and skip saveData
        try {
          [longformData] = await Promise.all([
            excelfucntions.generateLongFormData("US", "DataModel"),
            excelfucntions.saveData(),
          ]);
        } catch (err) {
          console.error("Error in special flow:", err);
          setPageValue(
            "SaveForecastPageinterim",
            "Some error occurred while saving, please try again"
          );
          return;
        }
      } else {
        // Default flow: generate long form + saveData
        try {
          [longformData] = await Promise.all([
            excelfucntions.generateLongFormData("US", "DataModel"),
            excelfucntions.saveData(),
          ]);
        } catch (err) {
          console.error("Error in default flow:", err);
          setPageValue(
            "SaveForecastPageinterim",
            "Some error occurred while saving, please try again"
          );
          return;
        }
      }

      setPageValue("LoadingCircleComponent", "75% | Saving your forecast...");

      const saveFlag = await AWSconnections.service_orchestration(
        "SAVE_LOCKED_FORECAST",
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

      // ← Notice backticks with actual newlines in the template literal:
      const message = `Forecast scenario saved for
Model: ${heading.replace("Save & Lock Scenario for:", "")}
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
          "Some error occurred while saving, please try again"
        );
      }
    } catch (error) {
      console.error("Unhandled error:", error);
      setPageValue(
        "SaveForecastPageinterim",
        "Some error occurred while saving, please try again"
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

  const handleCancel = () => setShowConfirm(false);

  // Render states:
  if (loading) {
    return <MessageBox>Connecting to data lake, please wait… </MessageBox>;
  }
  if (modelIDError) {
    return <MessageBox>{modelIDError}</MessageBox>;
  }
  if (!isOutputSheet) {
    return (
      <MessageBox>
       Current workbook is not a compatible forecast model. Please open the latest ADC models to use this feature.
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
        Save & Lock
      </SaveButton>

      {showConfirm && (
        <Overlay>
          <Modal>
            <ModalHeader>You are locking a scenario</ModalHeader>
            <ModalBody>
              Please confirm you want to lock “{scenarioName}” on cycle “
              {selectedCycle}”.
            </ModalBody>
            <ModalFooter>
              <ConfirmButton onClick={handleSaveConfirmed}>Yes</ConfirmButton>
              <ConfirmButton
                style={{ backgroundColor: "#63666A" }}
                onClick={handleCancel}
              >
                No
              </ConfirmButton>
            </ModalFooter>
          </Modal>
        </Overlay>
      )}
    </Container>
  );
};

export default SaveandLockScenario;
