import React, { useState, useEffect, useCallback, useMemo } from "react";
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
} from "./SaveandLockPageStylesagg";
import { DataFrame } from "dataframe-js";
import * as AWSconnections from "../../Middleware/AWSConnections";
import * as excelfucntions from "../../Middleware/ExcelConnection";
import * as inputfiles from "../../Middleware/inputfile";
import CONFIG from "../../Middleware/AWSConnections";

const AggLockScenario = ({ setPageValue }) => {
  // =============================================================================
  //                              STATE VARIABLES
  // =============================================================================
  const [selectedCycle, setSelectedCycle] = useState("");
  const [scenarioName, setScenarioName] = useState("");
  const [heading, setHeading] = useState("Active Sheet Name");
  const [isOutputSheet, setIsOutputSheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showLockedWarning, setShowLockedWarning] = useState(false);
  const [lockedScenarioInfo, setLockedScenarioInfo] = useState(null);

  // NEW: prompt to check if tabular summary has been refreshed
  const [showRefreshPrompt, setShowRefreshPrompt] = useState(false);

  const storedUsername = useMemo(() => sessionStorage.getItem("username"), []);
  const [cycleItems, setCycleItems] = useState([]);
  const [modelIDValue, setModelIDValue] = useState("");
  const [modelType, setModelType] = useState("");
  const [cloudLoadModelsList, setCloudLoadModelsList] = useState([]);
  const [dataFrames, setDataFrames] = useState({
    dfResult1: null,
    dfResult2: null,
    dfResult3: null,
  });

  // =============================================================================
  //                       HELPER FUNCTIONS & CALLBACKS
  // =============================================================================

  const checkScenarioExists = useCallback(
    (modelId, cycleName, scenarioName) => {
      const { dfResult1 } = dataFrames;
      if (!dfResult1) return false;
      const key = `${modelId}|${cycleName}|${scenarioName
        .trim()
        .toLowerCase()}`;
      return new Set(
        dfResult1
          .toCollection()
          .map((r) =>
            `${(r.model_id ?? "").toString()}|${(r.cycle_name ?? "").toString()}|${(
              r.scenario_name ?? ""
            )
              .toString()
              .trim()
              .toLowerCase()}`
          )
      ).has(key);
    },
    [dataFrames]
  );

  const findLockedScenario = useCallback(() => {
    const { dfResult1 } = dataFrames;
    if (!dfResult1) return null;
    const locked = dfResult1
      .toCollection()
      .find(
        (r) =>
          r.model_id === modelIDValue &&
          r.cycle_name === selectedCycle &&
          r.save_status === "Locked"
      );
    return locked
      ? { cycleName: locked.cycle_name, scenarioName: locked.scenario_name }
      : null;
  }, [dataFrames, modelIDValue, selectedCycle]);

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

        const modelNameValue = ranges.ModelName.values[0][0] || "";
        const modelID = ranges.ModelID.values[0][0] || "";
        const modelTypeVal = ranges.ModelType.values[0][0] || "";
        const loadedList = cloudLoadModelsRange.values;

        setHeading(`Save & Lock Aggregator Scenario for: ${modelNameValue}`);
        setModelIDValue(modelID);
        setModelType(modelTypeVal);
        setCloudLoadModelsList(loadedList);
        setIsOutputSheet(true);
      });
    } catch (error) {
      console.error(error);
      setIsOutputSheet(false);
    }
  }, []);

  const fetchDataFromLambda = useCallback(async () => {
    try {
      const resp = await AWSconnections.FetchMetaData(
        "FETCH_METADATA",
        localStorage.getItem("idToken"),
        CONFIG.AWS_SECRETS_NAME,
        localStorage.getItem("User_ID"),
        storedUsername
      );
      if (!resp || !resp.results1 || !resp.results2 || !resp.result3) {
        throw new Error("Incomplete metadata");
      }
      const df1 = new DataFrame(resp.results1);
      const df2 = new DataFrame(resp.results2);
      const df3 = new DataFrame(resp.result3);
      setDataFrames({ dfResult1: df1, dfResult2: df2, dfResult3: df3 });
      setCycleItems(
        df2.distinct("cycle_name").toArray().map((r) => r[0])
      );
    } catch (error) {
      console.error(error);
    }
  }, [storedUsername]);

  // =============================================================================
  //                          AUTHORIZATION CHECK
  // =============================================================================

  useEffect(() => {
    if (!loading && modelIDValue && dataFrames.dfResult3) {
      const authorized = dataFrames.dfResult3.toCollection().some(
        (m) => m.model_id === modelIDValue
      );
      if (!authorized) setIsOutputSheet(false);
    }
  }, [loading, modelIDValue, dataFrames]);

  // =============================================================================
  //                                INIT
  // =============================================================================

  useEffect(() => {
    (async () => {
      await Promise.all([checkofCloudBackendSheet(), fetchDataFromLambda()]);
      setLoading(false);
    })();
  }, [checkofCloudBackendSheet, fetchDataFromLambda]);

  // =============================================================================
  //                SAVE CLICK → EXISTENCE & LOCKED CHECK
  // =============================================================================

  const handleSaveClick = useCallback(() => {
    // Scenario-exists guard
    if (checkScenarioExists(modelIDValue, selectedCycle, scenarioName)) {
      setPageValue(
        "SaveForecastPageinterim",
        "Scenario names already exist in the database. Please choose a different scenario name."
      );
      return;
    }
    // Locked-scenario guard
    const info = findLockedScenario();
    if (info) {
      setLockedScenarioInfo(info);
      setShowLockedWarning(true);
    } else {
      setShowConfirm(true);
    }
  }, [
    checkScenarioExists,
    findLockedScenario,
    modelIDValue,
    selectedCycle,
    scenarioName,
    setPageValue,
  ]);

  const handleLockedConfirm = () => {
    setShowLockedWarning(false);
    handleSaveConfirmed();
  };
  const handleLockedCancel = () => setShowLockedWarning(false);

  // =============================================================================
  //                   AFTER USER CONFIRMS → SAVE LOGIC
  // =============================================================================

  const handleSaveConfirmed = useCallback(async () => {
    setShowConfirm(false);
    console.time("Total save time request");

    // Check access
    setPageValue("LoadingCircleComponent", "0% | Checking Access...");
    const access = await AWSconnections.ButtonAccess("SAVE_LOCKED_FORECAST");
    if (access?.message === "ACCESS DENIED") {
      setPageValue(
        "SaveForecastPageinterim",
        "You do not have permission to save forecast."
      );
      console.timeEnd("Total save time request");
      return;
    }

    // Redundant scenario-exists guard
    if (checkScenarioExists(modelIDValue, selectedCycle, scenarioName)) {
      setPageValue(
        "SaveForecastPageinterim",
        "Scenario names already exist in the database. Please choose a different scenario name."
      );
      console.timeEnd("Total save time request");
      return;
    }

    // Original save logic begins
    setPageValue("LoadingCircleComponent", "0% | Saving your forecast...");
    const df1 = dataFrames.dfResult1;
    if (!df1) return console.error("DataFrame df1 is not loaded yet.");

    // Build matchedForecasts
    const prefixedForecastIds = cloudLoadModelsList.map(
      (row) => `forecast_${row[6]}`
    );
    const matches = df1
      .toCollection()
      .filter((rec) => prefixedForecastIds.includes(rec.forecast_id));
    const matchedForecasts = matches.map((r) => ({
      model_id: r.model_id,
      forecast_id: r.forecast_id,
    }));

    // Cycle-match guard
    if (cloudLoadModelsList.some((row) => row[1] !== selectedCycle)) {
      setPageValue(
        "SaveForecastPageinterim",
        "Selected cycle doesn’t match with the indication models. Please select the correct models before saving."
      );
      console.timeEnd("Total save time request");
      return;
    }

    // Sync guard
    const allSynced = cloudLoadModelsList.every((row) => row[7] !== false);
    if (!allSynced) {
      setPageValue(
        "SaveForecastPageinterim",
        "All Indication Models are not Synced, please load models before saving"
      );
      console.timeEnd("Total save time request");
      return;
    }

    const concatenatedArray = cloudLoadModelsList.map(
      (row) => (row.length >= 7 ? `${row[0]} - ${row[6]}` : "")
    );

    try {
      await excelfucntions.setCalculationMode("manual");
      console.time("Parallel processes");
      const [longformData] = await Promise.all([
        excelfucntions.generateLongFormData("US", "DataModel"),
        excelfucntions.saveData(),
      ]);
      console.timeEnd("Parallel processes");
      setPageValue("LoadingCircleComponent", "50% | Saving your forecast...");

      console.time("save forecast");
      const saveFlag = await AWSconnections.service_orchestration(
        "SAVE_LOCKED_FORECAST_AGG",
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
        matchedForecasts,
        setPageValue
      );
      console.timeEnd("save forecast");

      if (saveFlag === "SUCCESS" || saveFlag.result === "DONE") {
        const message = `Forecast scenario saved & locked for model: ${heading.replace(
          "Save & Lock Aggregator Scenario for: ",
          ""
        )}\nCycle: ${selectedCycle}\nScenario: ${scenarioName}`;
        await AWSconnections.sync_MetaData_AGG(setPageValue);
        excelfucntions.setCalculationMode("automatic");
        await AWSconnections.writeMetadataToNamedCell(
          "last_scn_update",
          selectedCycle,
          scenarioName,
          "Locked"
        );
        setPageValue("SaveForecastPageinterim", message);
      } else if (
        saveFlag ===
          "A scenario of this name for the provided model and cycle details already exists, try with another one."
      ) {
        setPageValue(
          "SaveForecastPageinterim",
          "Scenario names already exist in the database. Please choose a different scenario name."
        );
      } else {
        setPageValue(
          "SaveForecastPageinterim",
          "Some Error Occurred, Please try again"
        );
      }
    } catch (error) {
      console.error("Error during save process:", error);
      setPageValue("SaveForecastPageinterim", "An error occurred during save");
    } finally {
      console.timeEnd("Total save time request");
    }
  }, [
    checkScenarioExists,
    dataFrames,
    cloudLoadModelsList,
    heading,
    modelIDValue,
    selectedCycle,
    scenarioName,
    setPageValue,
  ]);

  const handleCancel = () => setShowConfirm(false);

  // =============================================================================
  //                                RENDER
  // =============================================================================
  const isDisabled = !selectedCycle || !scenarioName;

  return (
    <Container>
      {loading ? (
        <MessageBox>Connecting to data lake, please wait…</MessageBox>
      ) : isOutputSheet ? (
        <>
          <Heading>{heading}</Heading>
          <DropdownContainer>
            <SelectDropdown
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value)}
            >
              <option value="" disabled>
                Select Cycle
              </option>
              {cycleItems.map((item, idx) => (
                <option key={idx} value={item}>
                  {item}
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

          {/* Save button opens the Refresh-prompt first */}
          <SaveButton
            onClick={() => setShowRefreshPrompt(true)}
            disabled={isDisabled}
            style={
              isDisabled
                ? { backgroundColor: "#ccc", cursor: "not-allowed" }
                : {}
            }
          >
            Save
          </SaveButton>

          {/* NEW MODAL: Have you refreshed the tabular summary? */}
          {showRefreshPrompt && (
            <Overlay>
              <Modal>
                <ModalHeader>
                  Please Confirm
                </ModalHeader>
                  <ModalBody>
                  Have you refreshed the tabular summary before saving?
                </ModalBody>
                <ModalFooter>
                  <ConfirmButton
                    onClick={() => {
                      setShowRefreshPrompt(false);
                      handleSaveClick();
                    }}
                  >
                    Yes
                  </ConfirmButton>
                  <ConfirmButton
                    style={{ backgroundColor: "#63666A" }}
                    onClick={() => setShowRefreshPrompt(false)}
                  >
                    No
                  </ConfirmButton>
                </ModalFooter>
              </Modal>
            </Overlay>
          )}

          {/* Locked-scenario warning modal */}
          {showLockedWarning && lockedScenarioInfo && (
            <Overlay>
              <Modal>
                <ModalHeader>Overwrite Locked Scenario?</ModalHeader>
                <ModalBody>
                  A scenario is already locked for cycle “
                  {lockedScenarioInfo.cycleName}” and Scenario Name: “
                  {lockedScenarioInfo.scenarioName}”.<br />
                  Proceeding will move the previous locked scenario to the
                  Interim.
                  <br />
                  Do you want to continue?
                </ModalBody>
                <ModalFooter>
                  <ConfirmButton onClick={handleLockedConfirm}>
                    Yes
                  </ConfirmButton>
                  <ConfirmButton
                    style={{ backgroundColor: "#63666A" }}
                    onClick={handleLockedCancel}
                  >
                    No
                  </ConfirmButton>
                </ModalFooter>
              </Modal>
            </Overlay>
          )}

          {/* Standard save confirmation modal */}
          {showConfirm && (
            <Overlay>
              <Modal>
                <ModalHeader>Lock this scenario?</ModalHeader>
                <ModalBody>
                  Please confirm you want to lock “{scenarioName}” on cycle “
                  {selectedCycle}”.
                </ModalBody>
                <ModalFooter>
                  <ConfirmButton onClick={handleSaveConfirmed}>
                    Yes
                  </ConfirmButton>
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
        </>
      ) : (
        <MessageBox>
          Current workbook is not a compatible forecast model. Please open the
          latest ADC models to use this feature.
        </MessageBox>
      )}
    </Container>
  );
};

export default AggLockScenario;
