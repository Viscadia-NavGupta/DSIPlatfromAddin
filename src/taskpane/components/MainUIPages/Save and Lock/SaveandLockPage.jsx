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
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);
  const [lockedScenarioInfo, setLockedScenarioInfo] = useState(null);

  const [dataFrames, setDataFrames] = useState({
    dfResult1: null,
    dfResult2: null,
    dfResult3: null,
  });

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
      const key = `${modelId}|${cycleName}|${scenarioName.trim().toLowerCase()}`;
      return scenarioSet.has(key);
    },
    [dataFrames.dfResult1, scenarioSet]
  );

  const checkLockedScenarioExists = useCallback(
    (modelId, cycleName) => {
      if (!dataFrames.dfResult1) return false;
      const match = dataFrames.dfResult1
        .toCollection()
        .find(
          (r) =>
            (r.model_id ?? "").toString().trim() === modelId &&
            (r.cycle_name ?? "").toString().trim() === cycleName &&
            (r.save_status ?? "").toString().trim().toLowerCase() === "locked"
        );

      if (match) {
        setLockedScenarioInfo({
          scenarioName: match.scenario_name ?? "",
          cycleName: match.cycle_name ?? "",
        });
        return true;
      }

      return false;
    },
    [dataFrames.dfResult1]
  );

  const checkofCloudBackendSheet = useCallback(async () => {
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

        const nameVal = (ranges.ModelName.values[0][0] ?? "").toString().trim();
        const idVal = (ranges.ModelID.values[0][0] ?? "").toString().trim();
        const typeVal = (ranges.ModelType.values[0][0] ?? "").toString().trim();

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
  }, [setPageValue]);

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

      setCycleItems(["LRP 25", "LRP 26", "Custom 1", "Custom 2"]);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, []);

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

  useEffect(() => {
    if (!loading && modelIDValue && dataFrames.dfResult3) {
      const allowed = dataFrames.dfResult3
        .toCollection()
        .some((m) => (m.model_id ?? "").toString() === modelIDValue);
      if (!allowed) {
        setModelIDError("Model ID mismatch. The current model is not authorized.");
        setIsOutputSheet(false);
      } else {
        setModelIDError("");
      }
    }
  }, [loading, modelIDValue, dataFrames.dfResult3]);

  const handleSaveClick = useCallback(() => {
    const lockedExists = checkLockedScenarioExists(modelIDValue, selectedCycle);
    if (lockedExists) {
      setShowOverwriteWarning(true);
    } else {
      setShowConfirm(true);
    }
  }, [checkLockedScenarioExists, modelIDValue, selectedCycle]);

  const proceedWithSave = useCallback(async () => {
    console.time("Total save time request");

    // Simulated 20-second progress instead of AWS calls
    const steps = [
      { pct: 0, label: "Checking Access...", delay: 0 },
      { pct: 15, label: "Preparing data...", delay: 4000 },
      { pct: 35, label: "Saving your forecast...", delay: 4000 },
      { pct: 55, label: "Locking scenario...", delay: 4000 },
      { pct: 75, label: "Finalizing save...", delay: 4000 },
      { pct: 100, label: "Save complete!", delay: 4000 },
    ];

    for (const step of steps) {
      if (step.delay > 0) await new Promise((r) => setTimeout(r, step.delay));
      setPageValue("LoadingCircleComponent", `${step.pct}% | ${step.label}`);
    }

    const message = `Forecast scenario saved for
Model: ${heading.replace("Save & Lock Scenario for:", "")}
Cycle: ${selectedCycle}
Scenario: ${scenarioName}`;

    setPageValue("SuccessMessagePage", message);

    console.timeEnd("Total save time request");
  }, [heading, modelIDValue, scenarioName, selectedCycle, setPageValue]);

  const handleSaveConfirmed = useCallback(async () => {
    setShowConfirm(false);

    if (checkScenarioExists(modelIDValue, selectedCycle, scenarioName)) {
      setPageValue(
        "SaveForecastPageinterim",
        "Scenario names already exist… choose a different one."
      );
      return;
    }

    await proceedWithSave();
  }, [modelIDValue, selectedCycle, scenarioName, checkScenarioExists, proceedWithSave]);

  const handleCancel = () => setShowConfirm(false);

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
              Please confirm you want to lock "{scenarioName}" on cycle "{selectedCycle}".
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

      {showOverwriteWarning && (
        <Overlay>
          <Modal>
            <ModalHeader>Overwrite Locked Scenario</ModalHeader>
            <ModalBody>
              A scenario is already locked for cycle "{lockedScenarioInfo?.cycleName}" and Scenario Name: "{lockedScenarioInfo?.scenarioName}"
              <br />
              Proceeding will move the existing locked scenario to the Interim.
              <br />
              Do you want to continue?
            </ModalBody>
            <ModalFooter>
              <ConfirmButton
                onClick={() => {
                  setShowOverwriteWarning(false);
                  proceedWithSave();
                }}
              >
                Yes, Continue
              </ConfirmButton>
              <ConfirmButton
                style={{ backgroundColor: "#63666A" }}
                onClick={() => setShowOverwriteWarning(false)}
              >
                Cancel
              </ConfirmButton>
            </ModalFooter>
          </Modal>
        </Overlay>
      )}
    </Container>
  );
};

export default SaveandLockScenario;
