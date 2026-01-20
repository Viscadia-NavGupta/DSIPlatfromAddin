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
  DetailedNotesButton,
  DetailedNotesContainer,
  DetailedNoteField,
  DetailedNoteLabel,
  DetailedTextArea,
  BackButton,
  CheckboxContainer,
  Checkbox,
  CheckboxLabel,
  NotesWrapper,
  BackButtonContainer,
  DetailedHeading,
} from "./SaveForecastPageStyles";
import { DataFrame } from "dataframe-js";
import * as AWSconnections from "../../Middleware/AWSConnections";
import * as excelfunctions from "../../Middleware/ExcelConnection";
import { specialModelIds } from "../../Middleware/Model Config";
import CONFIG from "../../Middleware/AWSConnections";

const SaveScenario = ({ setPageValue }) => {
  // ─── State ────────────────────────────────────────────────────────────────
  const [selectedCycle, setSelectedCycle] = useState("");
  const [scenarioName, setScenarioName] = useState("");
  const [saveInterimToPowerBI, setSaveInterimToPowerBI] = useState(false);
  const [forecasterNotes, setForecasterNotes] = useState("");
  const [showDetailedNotes, setShowDetailedNotes] = useState(false);
  const [detailedNotes, setDetailedNotes] = useState({
    epidemiology: "",
    marketShareAssumptions: "",
    patientConversion: "",
    demandConversion: "",
    revenueConversion: "",
  });
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

  // ─── Build scenario lookup ────────────────────────────────────────────────
  const scenarioSet = useMemo(() => {
    const df = dataFrames.dfResult1;
    if (!df) return new Set();
    return new Set(
      df.toCollection().map((r) => `${r.model_id}|${r.cycle_name}|${r.scenario_name.toString().trim().toLowerCase()}`)
    );
  }, [dataFrames.dfResult1]);

  const checkScenarioExists = useCallback(
    (modelId, cycleName, name) => {
      if (!dataFrames.dfResult1) return false;
      return scenarioSet.has(`${modelId}|${cycleName}|${name.trim().toLowerCase()}`);
    },
    [scenarioSet]
  );

  // ─── Detect & read “cloud_backend_md” ────────────────────────────────────
  const checkofCloudBackendSheet = useCallback(async () => {
    try {
      if (!window.Excel) return;
      await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        sheets.load("items/name");
        await context.sync();

        const mdSheet = sheets.items.find((s) => s.name.toLowerCase() === "cloud_backend_md");
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

        setHeading(`Save Scenario for: ${ranges.ModelName.values[0][0]}`);
        setModelIDValue(ranges.ModelID.values[0][0]);
        setModelType(ranges.ModelType.values[0][0]);
        setIsOutputSheet(true);

        if (ranges.ModelType.values[0][0] === "AGGREGATOR") {
          setPageValue("AggSaveScenario", "Loading scenario for Aggregator model...");
        }
      });
    } catch {
      setIsOutputSheet(false);
    }
  }, [setPageValue]);

  // ─── Fetch metadata ───────────────────────────────────────────────────────
  const fetchDataFromLambda = useCallback(async () => {
    try {
      const resp = await AWSconnections.FetchMetaData(
        "FETCH_METADATA",
        localStorage.getItem("idToken"),
        CONFIG.AWS_SECRETS_NAME,
        localStorage.getItem("User_ID"),
        localStorage.getItem("username")
      );
      setDataFrames({
        dfResult1: new DataFrame(resp.results1),
        dfResult2: new DataFrame(resp.results2),
        dfResult3: new DataFrame(resp.result3),
      });
      setCycleItems(
        new DataFrame(resp.results2)
          .distinct("cycle_name")
          .toArray()
          .map((r) => r[0])
          .filter((c) => c !== "ACTUALS")
      );
    } catch {
      /* ignore */
    }
  }, []);

  // ─── Initialize ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        await Promise.all([checkofCloudBackendSheet(), fetchDataFromLambda()]);
      } finally {
        setLoading(false);
      }
    })();
  }, [checkofCloudBackendSheet, fetchDataFromLambda]);

  // ─── Validate access ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && modelIDValue && dataFrames.dfResult3) {
      const ok = dataFrames.dfResult3.toCollection().some((m) => m.model_id === modelIDValue);
      if (!ok) {
        setModelIDError("Access to current model is not authorized. Please reach out to support team.");
        setIsOutputSheet(false);
      } else {
        setModelIDError("");
      }
    }
  }, [loading, modelIDValue, dataFrames.dfResult3]);

  // ─── Pre-populate from named range (scenario only) ────────────────────────
  useEffect(() => {
    if (!isOutputSheet) return;
    excelfunctions
      .readNamedRangeToArray("last_scn_update")
      .then((arr) => {
        const raw = arr?.[0]?.[0];
        if (typeof raw === "string") {
          raw.split(/\r?\n/).forEach((line) => {
            // removed cycle-name prepopulate:
            // if (/^cycle name:/i.test(line))
            //   setSelectedCycle(line.split(/cycle name:/i)[1].trim());

            if (/^scenario name:/i.test(line)) setScenarioName(line.split(/scenario name:/i)[1].trim());
          });
        }
      })
      .catch(() => {});
  }, [isOutputSheet]);

  // ─── Save handler ─────────────────────────────────────────────────────────
  const handleSaveClick = useCallback(async () => {
    console.time("Total save time");
    setPageValue("LoadingCircleComponent", "0% | Checking Access...");

    // 1. Permission
    const access = await AWSconnections.ButtonAccess("SAVE_FORECAST");
    if (access?.message === "ACCESS DENIED") {
      setPageValue("SaveForecastPageinterim", "You do not have permission to save forecast.");
      console.timeEnd("Total save time");
      return;
    }

    // 2. Check existing
    const existing = dataFrames.dfResult1
      .toCollection()
      .find(
        (r) =>
          r.model_id === modelIDValue &&
          r.cycle_name === selectedCycle &&
          r.scenario_name.toLowerCase() === scenarioName.toLowerCase()
      );
    if (existing && existing.save_status !== "Interim") {
      setPageValue("SaveForecastPageinterim", "Scenario name already exists… choose a different one.");
      console.timeEnd("Total save time");
      return;
    }

    // 3. Determine action
    let actionType;
    if (saveInterimToPowerBI && existing?.save_status === "Interim") {
      actionType = "SANDBOXED_TO_INTERIM_FORECAST";
    } else if (saveInterimToPowerBI) {
      actionType = "SAVE_FORECAST";
    } else {
      actionType = "SAVE_SANDBOX";
    }

    // 4. Prepare data
    await excelfunctions.setCalculationMode("manual");
    setPageValue("LoadingCircleComponent", "0% | Saving your forecast...");
    let longformData, outputbackend_data;
    if (specialModelIds.includes(modelIDValue)) {
      longformData = await excelfunctions.generateLongFormData("US", "DataModel");
      await excelfunctions.saveData();
    } else {
      const [lf, , ob] = await Promise.all([
        excelfunctions.generateLongFormData("US", "DataModel"),
        excelfunctions.saveData(),
        excelfunctions.readNamedRangeToArray("aggregator_data"),
      ]);
      longformData = lf;
      outputbackend_data = ob;
    }

    // 5. Orchestrate
    let saveFlag,
      strippedForecastId = null;
    setPageValue("LoadingCircleComponent", "75% | Saving your forecast...");

    // Create notes JSON body
    const notesBody = {
      forecaster_notes: forecasterNotes,
      epidemiology: detailedNotes.epidemiology,
      market_share_assumptions: detailedNotes.marketShareAssumptions,
      patient_conversion: detailedNotes.patientConversion,
      demand_conversion: detailedNotes.demandConversion,
      revenue_conversion: detailedNotes.revenueConversion,
    };
    console.log("notes:", JSON.stringify(notesBody, null, 2));

    if (actionType === "SANDBOXED_TO_INTERIM_FORECAST") {
      const rawId = existing?.forecast_id ?? "";
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
        [],
        [],
        setPageValue,
        [],
        [],
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
        outputbackend_data,
        [],
        [],
        [],
        setPageValue,
        [],
        [],
        [],
        JSON.stringify(notesBody)
      );
    }

    // 6. Finalize
    const msg = `Forecast scenario saved for\nModel: ${heading.replace(
      "Save Scenario for: ",
      ""
    )}\nCycle: ${selectedCycle}\nScenario: ${scenarioName}`;
    if (saveFlag === "SUCCESS" || saveFlag?.result === "DONE") {
      setPageValue("SuccessMessagePage", msg);
      const statusLabel = saveInterimToPowerBI ? "Interim + BI" : "Interim";

      await AWSconnections.writeMetadataToNamedCell("last_scn_update", selectedCycle, scenarioName, statusLabel);
      await excelfunctions.setCalculationMode("automatic");
      console.log("strippedForecastId:", strippedForecastId);
    } else {
      setPageValue("SaveForecastPageinterim", "Some error occurred while saving, please try again");
    }

    console.timeEnd("Total save time");
  }, [
    dataFrames.dfResult1,
    modelIDValue,
    selectedCycle,
    scenarioName,
    saveInterimToPowerBI,
    forecasterNotes,
    detailedNotes,
    setPageValue,
    heading,
  ]);

  // ─── Render / early returns ────────────────────────────────────────────────
  if (loading) return <MessageBox>Connecting to data lake, please wait…</MessageBox>;
  if (modelIDError) return <MessageBox>{modelIDError}</MessageBox>;
  if (!isOutputSheet)
    return (
      <MessageBox>
        Current workbook is not a compatible forecast model. Please open the latest ADC models to use this feature.
      </MessageBox>
    );

  const isDisabled = !selectedCycle || !scenarioName;
  const maxCharacters = 500;
  const remainingCharacters = maxCharacters - forecasterNotes.length;

  const handleDetailedNoteChange = (field, value) => {
    setDetailedNotes((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Container>
      {!showDetailedNotes ? (
        <>
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
              type="text"
              placeholder="Enter Scenario Name"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
            />
          </DropdownContainer>

          <CheckboxContainer>
            <Checkbox
              id="saveInterimToPowerBI"
              type="checkbox"
              checked={saveInterimToPowerBI}
              onChange={(e) => setSaveInterimToPowerBI(e.target.checked)}
              style={{ accentColor: saveInterimToPowerBI ? "green" : undefined }}
            />
            <CheckboxLabel htmlFor="saveInterimToPowerBI">Save interim to PowerBI</CheckboxLabel>
          </CheckboxContainer>

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

          {forecasterNotes.trim() && (
            <DetailedNotesButton onClick={() => setShowDetailedNotes(true)} type="button">
              Add Detailed Notes
            </DetailedNotesButton>
          )}

          <SaveButton
            onClick={handleSaveClick}
            disabled={isDisabled}
            style={isDisabled ? { backgroundColor: "#ccc", cursor: "not-allowed" } : {}}
          >
            Save
          </SaveButton>
        </>
      ) : (
        <>
          <BackButtonContainer>
            <BackButton onClick={() => setShowDetailedNotes(false)} type="button">
              ←
            </BackButton>
            <DetailedHeading>{heading}</DetailedHeading>
          </BackButtonContainer>

          <DetailedNotesContainer>
            <DetailedNoteField>
              <DetailedNoteLabel>Epidemiology</DetailedNoteLabel>
              <DetailedTextArea
                placeholder="-"
                value={detailedNotes.epidemiology}
                onChange={(e) => handleDetailedNoteChange("epidemiology", e.target.value)}
              />
            </DetailedNoteField>

            <DetailedNoteField>
              <DetailedNoteLabel>Market Share Assumptions</DetailedNoteLabel>
              <DetailedTextArea
                placeholder="-"
                value={detailedNotes.marketShareAssumptions}
                onChange={(e) => handleDetailedNoteChange("marketShareAssumptions", e.target.value)}
              />
            </DetailedNoteField>

            <DetailedNoteField>
              <DetailedNoteLabel>Patient Conversion</DetailedNoteLabel>
              <DetailedTextArea
                placeholder="-"
                value={detailedNotes.patientConversion}
                onChange={(e) => handleDetailedNoteChange("patientConversion", e.target.value)}
              />
            </DetailedNoteField>

            <DetailedNoteField>
              <DetailedNoteLabel>Demand Conversion</DetailedNoteLabel>
              <DetailedTextArea
                placeholder="-"
                value={detailedNotes.demandConversion}
                onChange={(e) => handleDetailedNoteChange("demandConversion", e.target.value)}
              />
            </DetailedNoteField>

            <DetailedNoteField>
              <DetailedNoteLabel>Revenue Conversion</DetailedNoteLabel>
              <DetailedTextArea
                placeholder="-"
                value={detailedNotes.revenueConversion}
                onChange={(e) => handleDetailedNoteChange("revenueConversion", e.target.value)}
              />
            </DetailedNoteField>
          </DetailedNotesContainer>

          <SaveButton
            onClick={handleSaveClick}
            disabled={isDisabled}
            style={isDisabled ? { backgroundColor: "#ccc", cursor: "not-allowed" } : {}}
          >
            Save
          </SaveButton>
        </>
      )}
    </Container>
  );
};

export default SaveScenario;
