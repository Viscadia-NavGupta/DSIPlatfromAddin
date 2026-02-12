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
  CheckboxRow,
  SectionLabel,
  TextArea,
  CharacterCount,
  NotesWrapper,
} from "./SaveForecastPageAggStyles";
import { DataFrame } from "dataframe-js";
import * as AWSconnections from "../../Middleware/AWSConnections";
import * as excelfunctions from "../../Middleware/ExcelConnection";
import { specialModelIds } from "../../Middleware/Model Config";
import CONFIG from "../../Middleware/AWSConnections";

const AggSaveScenario = ({ setPageValue }) => {
  // =============================================================================
  //                              STATE VARIABLES
  // =============================================================================
  const [selectedCycle, setSelectedCycle] = useState("");
  const [scenarioName, setScenarioName] = useState("");
  const [saveInterimToPowerBI, setSaveInterimToPowerBI] = useState(false);
  const [forecasterNotes, setForecasterNotes] = useState("");
  const [heading, setHeading] = useState("Active Sheet Name");
  const [isOutputSheet, setIsOutputSheet] = useState(false);
  const [modelIDError, setModelIDError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showNotesPrompt, setShowNotesPrompt] = useState(false);

  const storedUsername = useMemo(() => sessionStorage.getItem("username"), []);
  const [cycleItems, setCycleItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modelIDValue, setModelIDValue] = useState("");
  const [cloudLoadModelsList, setCloudLoadModelsList] = useState([]);
  const [dataFrames, setDataFrames] = useState({
    dfResult1: null,
    dfResult2: null,
    dfResult3: null,
  });

  // Build a set of existing scenarios
  const scenarioSet = useMemo(() => {
    const df = dataFrames.dfResult1;
    if (!df) return new Set();
    return new Set(
      df.toCollection().map((r) => `${r.model_id}|${r.cycle_name}|${r.scenario_name.toString().trim().toLowerCase()}`)
    );
  }, [dataFrames.dfResult1]);

  const checkScenarioExists = useCallback(
    (modelId, cycle, scen) => {
      if (!dataFrames.dfResult1) return false;
      return scenarioSet.has(`${modelId}|${cycle}|${scen.trim().toLowerCase()}`);
    },
    [scenarioSet, dataFrames.dfResult1]
  );

  // Check for cloud_backend_md sheet and named range
  const checkofCloudBackendSheet = useCallback(async () => {
    try {
      if (!window.Excel) return;
      await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        sheets.load("items/name");
        await context.sync();

        const meta = sheets.items.find((s) => s.name.toLowerCase() === "cloud_backend_md");
        if (!meta) return setIsOutputSheet(false);

        const ranges = {
          ModelName: meta.getRange("B5"),
          ModelID: meta.getRange("B7"),
          ModelType: meta.getRange("B8"),
        };
        Object.values(ranges).forEach((r) => r.load("values"));

        const named = context.workbook.names.getItem("Cloud_LoadModels_List");
        const cloudRange = named.getRange();
        cloudRange.load("values");

        await context.sync();

        const nameVal = ranges.ModelName.values[0][0] || "";
        const idVal = ranges.ModelID.values[0][0] || "";
        const loaded = cloudRange.values || [];

        setHeading(`Save Aggregator Scenario for: ${nameVal}`);
        setModelIDValue(idVal);
        setCloudLoadModelsList(loaded);
        setIsOutputSheet(true);
      });
    } catch {
      setIsOutputSheet(false);
    }
  }, []);

  // Fetch metadata
  const fetchDataFromLambda = useCallback(async () => {
    try {
      const resp = await AWSconnections.FetchMetaData(
        "FETCH_METADATA",
        localStorage.getItem("idToken"),
        CONFIG.AWS_SECRETS_NAME,
        localStorage.getItem("User_ID"),
        storedUsername
      );
      const df1 = new DataFrame(resp.results1 || []);
      const df2 = new DataFrame(resp.results2 || []);
      const df3 = new DataFrame(resp.results3 || []);

      setDataFrames({ dfResult1: df1, dfResult2: df2, dfResult3: df3 });

      const cycles = df2
        .distinct("cycle_name")
        .toArray()
        .map((r) => r[0])
        .filter((c) => c && c.toString().toUpperCase() !== "ACTUALS");
      setCycleItems(cycles);
    } catch {
      // ignore
    }
  }, [storedUsername]);

  // Initialize
  useEffect(() => {
    (async () => {
      await Promise.all([checkofCloudBackendSheet(), fetchDataFromLambda()]);
      setLoading(false);
    })();
  }, [checkofCloudBackendSheet, fetchDataFromLambda]);

  // Prepopulate scenario name
  useEffect(() => {
    if (!isOutputSheet) return;
    excelfunctions
      .readNamedRangeToArray("last_scn_update")
      .then((arr) => {
        const raw = arr?.[0]?.[0] || "";
        raw.split(/\r?\n/).forEach((line) => {
          if (/^scenario name:/i.test(line)) {
            setScenarioName(line.split(/scenario name:/i)[1].trim());
          }
        });
      })
      .catch(() => {});
  }, [isOutputSheet]);

  const handleSaveClick = useCallback(() => {
    // Check if forecaster notes are empty
    if (!forecasterNotes.trim()) {
      setShowNotesPrompt(true);
      return;
    }

    // Proceed with save
    proceedWithSave();
  }, [forecasterNotes]);

  const proceedWithSave = useCallback(async () => {
    console.time("save");
    setPageValue("LoadingCircleComponent", "Checking Access...");

    // Permission
    const access = await AWSconnections.ButtonAccess("SAVE_FORECAST");
    if (access?.message === "ACCESS DENIED") {
      setPageValue("SaveForecastPageinterim", "You do not have permission to save forecast.");
      console.timeEnd("save");
      return;
    }

    // Existing record
    const existing = dataFrames.dfResult1
      ?.toCollection()
      .find(
        (r) =>
          r.model_id === modelIDValue &&
          r.cycle_name === selectedCycle &&
          r.scenario_name.toLowerCase() === scenarioName.toLowerCase()
      );

    // Determine actionType
    let actionType;
    if (saveInterimToPowerBI && existing?.save_status === "Interim") {
      actionType = "SANDBOXED_TO_INTERIM_FORECAST_AGG";
    } else if (saveInterimToPowerBI) {
      actionType = "SAVE_FORECAST_AGG";
    } else {
      actionType = "SAVE_SANDBOX_AGG";
    }

    // Duplicate check (not for sandbox→interim)
    if (actionType !== "SANDBOXED_TO_INTERIM_FORECAST" && existing && existing.save_status !== "Interim") {
      setPageValue("SaveForecastPageinterim", "Scenario name already exists… choose a different one.");
      console.timeEnd("save");
      return;
    }

    // Cycle vs loaded list
    if (Array.isArray(cloudLoadModelsList) && cloudLoadModelsList.some((row) => row[1] !== selectedCycle)) {
      setPageValue("SaveForecastPageinterim", "Selected cycle doesn’t match the loaded models.");
      console.timeEnd("save");
      return;
    }

    // Sync check
    if (!cloudLoadModelsList.every((row) => row[7] !== false)) {
      setPageValue("SaveForecastPageinterim", "All Indication Models must be synced before saving.");
      console.timeEnd("save");
      return;
    }

    try {
      await excelfunctions.setCalculationMode("manual");
      setPageValue("LoadingCircleComponent", "0% | Saving your forecast...");

      const longformData = await excelfunctions.generateLongFormData("US", "DataModel");
      await excelfunctions.saveData();
      setPageValue("LoadingCircleComponent", "50% | Saving your forecast...");

      // Create notes JSON body for Lambda API
      const notesBody = {
        forecaster_notes: forecasterNotes,
        epidemiology: "-",
        market_share_assumptions: "-",
        patient_conversion: "-",
        demand_conversion: "-",
        revenue_conversion: "-",
      };
      console.log("notes:", JSON.stringify(notesBody, null, 2));

      // Create Excel notes JSON body
      const currentDate = new Date().toLocaleDateString("en-US");
      const firstName = localStorage.getItem("firstName") || "";
      const ownerName = `${firstName}`.trim();
      const statusLabel = saveInterimToPowerBI ? "Interim + BI" : "Interim";

      const excelNotesBody = {
        basic_details: {
          cycle_name: selectedCycle,
          status: statusLabel,
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

      let saveFlag,
        strippedForecastId = null;
      if (actionType === "SANDBOXED_TO_INTERIM_FORECAST_AGG") {
        const rawId = existing?.forecast_id || "";
        strippedForecastId = rawId.replace(/^forecast_/, "");
        saveFlag = await AWSconnections.service_orchestration(
          actionType,
          "",
          "",
          "",
          "",
          "",
          "",
          strippedForecastId,
          [],
          [],
          [],
          cloudLoadModelsList.map((row) => `${row[0]} - ${row[6]}`),
          [],
          setPageValue,
          [],
          cloudLoadModelsList.map((row) => `${row[0]} - ${row[6]}|${row[3]}|`),
          [],
          JSON.stringify(notesBody)
        );
      } else {
        saveFlag = await AWSconnections.service_orchestration(
          actionType,
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
          cloudLoadModelsList.map((row) => `${row[0]} - ${row[6]}`),
          [],
          setPageValue,
          [],
          cloudLoadModelsList.map((row) => `${row[0]} - ${row[6]}|${row[3]}|`),
          [],
          JSON.stringify(notesBody)
        );
      }

      if (saveFlag === "SUCCESS" || saveFlag?.result === "DONE") {
        // await AWSconnections.sync_MetaData_AGG(setPageValue);
        // Write notes to Excel named ranges
        const excelWriteResult = await AWSconnections.writeForecastNotesToExcel(excelNotesBody);
        console.log("Excel notes write result:", excelWriteResult);

        // Submit model forecast notes and get changelog data
        console.log("📤 Fetching forecast changelog for model:", modelIDValue);
        const notesSubmissionResponse = await AWSconnections.submitModelForecastNotes(modelIDValue, strippedForecastId);
        console.log("Notes submission response:", notesSubmissionResponse);

        // Write changelog to Excel if successful
        if (notesSubmissionResponse.status === "success" && notesSubmissionResponse.data) {
          const changelogResult = await AWSconnections.writeForecastChangelogToExcel(notesSubmissionResponse.data);
          console.log("Changelog write result:", changelogResult);
        } else {
          console.warn("⚠️ Failed to fetch changelog data:", notesSubmissionResponse.message);
        }
        await excelfunctions.setCalculationMode("automatic");
        setPageValue("SuccessMessagePage", `Saved: ${heading}\nCycle: ${selectedCycle}\nScenario: ${scenarioName}`);
        const statusLabel = saveInterimToPowerBI ? "Interim + BI" : "Interim";
        await AWSconnections.writeMetadataToNamedCell("last_scn_update", selectedCycle, scenarioName, statusLabel);
      } else {
        setPageValue("SaveForecastPageinterim", "Error occurred while saving.");
      }
    } catch {
      setPageValue("SaveForecastPageinterim", "Error occurred while saving.");
    } finally {
      console.timeEnd("save");
    }
  }, [
    dataFrames.dfResult1,
    modelIDValue,
    selectedCycle,
    scenarioName,
    saveInterimToPowerBI,
    forecasterNotes,
    cloudLoadModelsList,
    setPageValue,
    heading,
  ]);

  const handleInitialClick = useCallback(() => setShowConfirm(true), []);
  const handleCancel = useCallback(() => setShowConfirm(false), []);
  const handleConfirm = useCallback(() => {
    setShowConfirm(false);
    handleSaveClick();
  }, [handleSaveClick]);

  const handleNotesPromptOk = () => {
    setShowNotesPrompt(false);
  };

  if (loading) return <MessageBox>Connecting to data lake, please wait…</MessageBox>;
  if (modelIDError) return <MessageBox>{modelIDError}</MessageBox>;
  if (!isOutputSheet) return <MessageBox>Open a compatible forecast model to use this feature.</MessageBox>;

  const isDisabled = !selectedCycle || !scenarioName;
  const maxCharacters = 500;
  const remainingCharacters = maxCharacters - forecasterNotes.length;

  return (
    <Container>
      <Heading>{heading}</Heading>
      <DropdownContainer>
        <SelectDropdown value={selectedCycle} onChange={(e) => setSelectedCycle(e.target.value)}>
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
          placeholder="Enter Scenario Name"
          value={scenarioName}
          onChange={(e) => setScenarioName(e.target.value)}
        />
      </DropdownContainer>

      <CheckboxRow>
        <input
          type="checkbox"
          id="saveInterimToPowerBI"
          checked={saveInterimToPowerBI}
          onChange={(e) => setSaveInterimToPowerBI(e.target.checked)}
          style={{ accentColor: saveInterimToPowerBI ? "green" : undefined }}
        />
        <label htmlFor="saveInterimToPowerBI" style={{ marginLeft: "0.5rem" }}>
          Save interim to PowerBI
        </label>
      </CheckboxRow>

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
        onClick={handleInitialClick}
        disabled={isDisabled}
        style={isDisabled ? { backgroundColor: "#ccc", cursor: "not-allowed" } : {}}
      >
        Save
      </SaveButton>

      {/* Prompt: Forecaster Notes Required */}
      {showNotesPrompt && (
        <Overlay>
          <Modal>
            <ModalHeader>Forecaster Notes Required</ModalHeader>
            <ModalBody>Please add forecaster notes before saving.</ModalBody>
            <ModalFooter>
              <ConfirmButton onClick={handleNotesPromptOk}>OK</ConfirmButton>
            </ModalFooter>
          </Modal>
        </Overlay>
      )}

      {/* Prompt: Output Refresh Confirmation */}
      {showConfirm && (
        <Overlay>
          <Modal>
            <ModalHeader>Please Confirm</ModalHeader>
            <ModalBody>Have you refreshed the "Outputs"?</ModalBody>
            <ModalFooter>
              <ConfirmButton onClick={handleConfirm}>Yes</ConfirmButton>
              <ConfirmButton onClick={handleCancel} style={{ backgroundColor: "#63666A" }}>
                No
              </ConfirmButton>
            </ModalFooter>
          </Modal>
        </Overlay>
      )}
    </Container>
  );
};

export default AggSaveScenario;
