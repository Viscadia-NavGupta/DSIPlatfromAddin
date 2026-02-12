import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Heading,
  MessageBox,
  DropdownContainer,
  SelectDropdown,
  Input,
  SaveButton,
  SectionLabel,
  TextArea,
  CharacterCount,
  NotesWrapper,
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
  const [forecasterNotes, setForecasterNotes] = useState("");
  const [heading, setHeading] = useState("Active Sheet Name");
  const [isOutputSheet, setIsOutputSheet] = useState(false);
  const [loading, setLoading] = useState(true);

  // modals
  const [showRefreshPrompt, setShowRefreshPrompt] = useState(false);
  const [showLockedWarning, setShowLockedWarning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showNotesPrompt, setShowNotesPrompt] = useState(false);

  const [lockedScenarioInfo, setLockedScenarioInfo] = useState(null);

  // data
  const storedUsername = useMemo(() => sessionStorage.getItem("username"), []);
  const [cycleItems, setCycleItems] = useState([]);
  const [cloudLoadModelsList, setCloudLoadModelsList] = useState([]);
  const [modelIDValue, setModelIDValue] = useState("");
  const [modelType, setModelType] = useState("");
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
      const df1 = dataFrames.dfResult1;
      if (!df1) return false;
      const key = `${modelId}|${cycleName}|${scenarioName.trim().toLowerCase()}`;
      return new Set(
        df1
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
    const df1 = dataFrames.dfResult1;
    if (!df1) return null;
    const locked = df1
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

  // =============================================================================
  //                          EXCEL SHEET METADATA CHECK
  // =============================================================================

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

        const cloudLoadModelsName = context.workbook.names.getItem(
          "Cloud_LoadModels_List"
        );
        const cloudLoadModelsRange = cloudLoadModelsName.getRange();
        cloudLoadModelsRange.load("values");

        await context.sync();

        const modelNameValue = (ranges.ModelName.values[0][0] ?? "").toString().trim();
        const modelID = (ranges.ModelID.values[0][0] ?? "").toString().trim();
        const modelTypeVal = (ranges.ModelType.values[0][0] ?? "").toString().trim();
        const loadedList = cloudLoadModelsRange.values;

        setHeading(`Save & Lock Aggregator Scenario for: ${modelNameValue}`);
        setModelIDValue(modelID);
        setModelType(modelTypeVal);
        setCloudLoadModelsList(loadedList);
        setIsOutputSheet(true);
      });
    } catch (error) {
      console.error("Error checking Outputs sheet:", error);
      setIsOutputSheet(false);
    }
  }, []);

  // =============================================================================
  //                         LAMBDA DATA FETCH
  // =============================================================================

  const fetchDataFromLambda = useCallback(async () => {
    try {
      const resp = await AWSconnections.FetchMetaData(
        "FETCH_METADATA",
        localStorage.getItem("idToken"),
        CONFIG.AWS_SECRETS_NAME,
        localStorage.getItem("User_ID"),
        storedUsername
      );
      if (!resp?.results1 || !resp?.results2 || !resp?.result3) {
        throw new Error("Incomplete metadata");
      }

      const df1 = new DataFrame(resp.results1);
      const df2 = new DataFrame(resp.results2);
      const df3 = new DataFrame(resp.result3);
      setDataFrames({ dfResult1: df1, dfResult2: df2, dfResult3: df3 });

      // — FILTER OUT “ACTUALS” CYCLE —
      const allCycles = df2
        .distinct("cycle_name")
        .toArray()
        .map((r) => (r[0] ?? "").toString().trim());
      const filteredCycles = allCycles.filter(
        (cycle) => cycle.toUpperCase() !== "ACTUALS"
      );
      setCycleItems(filteredCycles);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, [storedUsername]);

  // =============================================================================
  //                          AUTH CHECK & INIT
  // =============================================================================

  useEffect(() => {
    (async () => {
      await Promise.all([checkofCloudBackendSheet(), fetchDataFromLambda()]);
      setLoading(false);
    })();
  }, [checkofCloudBackendSheet, fetchDataFromLambda]);

  useEffect(() => {
    if (!loading && modelIDValue && dataFrames.dfResult3) {
      const authorized = dataFrames.dfResult3
        .toCollection()
        .some((m) => m.model_id === modelIDValue);
      if (!authorized) {
        setIsOutputSheet(false);
      }
    }
  }, [loading, modelIDValue, dataFrames]);

  // =============================================================================
  //                SAVE CLICK → EXistence & LOCKED CHECK
  // =============================================================================

  const handleSaveClick = useCallback(() => {
    // Debug: Log forecaster notes before validation
    console.log("🔍 Forecaster Notes State:", forecasterNotes);
    console.log("🔍 Notes Length:", forecasterNotes.length);
    console.log("🔍 Notes Trimmed:", forecasterNotes.trim());
    
    // Check if forecaster notes are empty
    if (!forecasterNotes.trim()) {
      console.warn("⚠️ Notes are empty - showing prompt");
      setShowNotesPrompt(true);
      return;
    }

    // 1) scenario-name-exists guard
    if (
      checkScenarioExists(modelIDValue, selectedCycle, scenarioName)
    ) {
      setPageValue(
        "SaveForecastPageinterim",
        "Scenario names already exist in the database. Please choose a different scenario name."
      );
      return;
    }
    // 2) locked-scenario guard
    const info = findLockedScenario();
    if (info) {
      setLockedScenarioInfo(info);
      setShowLockedWarning(true);
    } else {
      setShowConfirm(true);
    }
  }, [
    forecasterNotes,
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
  const handleNotesPromptOk = () => setShowNotesPrompt(false);

  // =============================================================================
  //            AFTER USER CONFIRMS → ACTUAL SAVE LOGIC
  // =============================================================================

  const handleSaveConfirmed = useCallback(async () => {
    setShowConfirm(false);
    console.time("Total save time request");

    // access check
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

    // redundant scenario-exists guard
    if (
      checkScenarioExists(modelIDValue, selectedCycle, scenarioName)
    ) {
      setPageValue(
        "SaveForecastPageinterim",
        "Scenario names already exist in the database. Please choose a different scenario name."
      );
      console.timeEnd("Total save time request");
      return;
    }

    // begin save
    setPageValue("LoadingCircleComponent", "0% | Saving your forecast...");
    const df1 = dataFrames.dfResult1;
    if (!df1) {
      console.error("DataFrame dfResult1 not loaded.");
      return;
    }

    // prepare matchedForecasts
    const prefixes = cloudLoadModelsList.map((row) => `forecast_${row[6]}`);
    const matches = df1
      .toCollection()
      .filter((rec) => prefixes.includes(rec.forecast_id));
    const matchedForecasts = matches.map((r) => ({
      model_id: r.model_id,
      forecast_id: r.forecast_id,
    }));

    // cycle-match guard
    if (cloudLoadModelsList.some((row) => row[1] !== selectedCycle)) {
      setPageValue(
        "SaveForecastPageinterim",
        "Selected cycle doesn’t match with the indication models. Please select the correct models before saving."
      );
      console.timeEnd("Total save time request");
      return;
    }

    // sync guard
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

      // Create notes JSON body for Lambda API (AGG uses simplified notes)
      const notesBody = {
        forecaster_notes: forecasterNotes,
        epidemiology: "-",
        market_share_assumptions: "-",
        patient_conversion: "-",
        demand_conversion: "-",
        revenue_conversion: "-",
      };
      console.log("notes:", JSON.stringify(notesBody, null, 2));

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
        setPageValue,
        [],
        cloudLoadModelsList.map(row =>
          row.length >= 7 ? `${row[0]} - ${row[6]}|${row[3]}|` : ""
        ),
        [],
        JSON.stringify(notesBody)
      );
      console.timeEnd("save forecast");

      if (saveFlag === "SUCCESS" || saveFlag.result === "DONE" ||  saveFlag.status ==="SUCCESS") {
        // Create Excel notes JSON body
        const currentDate = new Date().toLocaleDateString("en-US");
        const firstName = localStorage.getItem("firstName") || "";
        const ownerName = `${firstName}`.trim();

        const excelNotesBody = {
          basic_details: {
            cycle_name: selectedCycle,
            status: "Locked",
            scenario_name: scenarioName,
            saved_at: currentDate,
            loaded_at: currentDate,
            owner: ownerName,
          },
          forecaster_notes: forecasterNotes,
          detailed_notes: {
            epidemiology: "-",
            market_share: "-",
            patient_conversion: "-",
            demand_conversion: "-",
            revenue_conversion: "-",
          },
        };
        console.log("Excel notes body:", JSON.stringify(excelNotesBody, null, 2));

        // Write notes to Excel named ranges
        const excelWriteResult = await AWSconnections.writeForecastNotesToExcel(excelNotesBody);
        console.log("Excel notes write result:", excelWriteResult);

        // Submit model forecast notes and get changelog data
        console.log("📤 Fetching forecast changelog for model:", modelIDValue);
        const notesSubmissionResponse = await AWSconnections.submitModelForecastNotes(modelIDValue, null);
        console.log("Notes submission response:", notesSubmissionResponse);

        // Write changelog to Excel if successful
        if (notesSubmissionResponse.status === "success" && notesSubmissionResponse.data) {
          const changelogResult = await AWSconnections.writeForecastChangelogToExcel(notesSubmissionResponse.data);
          console.log("Changelog write result:", changelogResult);
        } else {
          console.warn("⚠️ Failed to fetch changelog data:", notesSubmissionResponse.message);
        }

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
        setPageValue("SuccessMessagePage", message);
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
    forecasterNotes,
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
  const maxCharacters = 500;
  const remainingCharacters = maxCharacters - forecasterNotes.length;

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

          <NotesWrapper>
            <SectionLabel>Forecaster Notes</SectionLabel>
            <TextArea
              placeholder="Add your notes here..."
              value={forecasterNotes}
              onChange={(e) => {
                if (e.target.value.length <= maxCharacters) {
                  setForecasterNotes(e.target.value);
                }
              }}
              maxLength={maxCharacters}
            />
            <CharacterCount isNearLimit={remainingCharacters < 50}>
              {remainingCharacters} characters remaining
            </CharacterCount>
          </NotesWrapper>

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

          {/* Refresh-prompt modal */}
          {showRefreshPrompt && (
            <Overlay>
              <Modal>
                <ModalHeader>Please Confirm</ModalHeader>
                <ModalBody>
                  Have you refreshed the "Outputs" before saving?
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
                  {lockedScenarioInfo.scenarioName}”.
                  <br />
                  Proceeding will move the previous locked scenario to Interim.
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

          {/* Final save confirmation modal */}
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

          {/* Prompt: Forecaster Notes Required */}
          {showNotesPrompt && (
            <Overlay>
              <Modal>
                <ModalHeader>Forecaster Notes Required</ModalHeader>
                <ModalBody>
                  Please add forecaster notes before saving.
                </ModalBody>
                <ModalFooter>
                  <ConfirmButton onClick={handleNotesPromptOk}>OK</ConfirmButton>
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
