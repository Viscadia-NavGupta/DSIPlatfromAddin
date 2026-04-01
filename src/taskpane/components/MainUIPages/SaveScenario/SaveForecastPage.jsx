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
  Overlay,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ConfirmButton,
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
  const [showNotesPrompt, setShowNotesPrompt] = useState(false);
  const [showDetailedNotesPrompt, setShowDetailedNotesPrompt] = useState(false);
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

  // ─── Detect & read "cloud_backend_md" ────────────────────────────────────
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
      setCycleItems(["LRP 25", "LRP 26", "Custom 1", "Custom 2"]);
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
  const handleSaveClick = useCallback(() => {
    // Check if forecaster notes are empty
    if (!forecasterNotes.trim()) {
      setShowNotesPrompt(true);
      return;
    }

    // Check if detailed notes are all empty
    const hasDetailedNotes = Object.values(detailedNotes).some(note => note.trim());
    if (!hasDetailedNotes) {
      setShowDetailedNotesPrompt(true);
      return;
    }

    // Proceed with save
    proceedWithSave();
  }, [forecasterNotes, detailedNotes]);

  const proceedWithSave = useCallback(async () => {
    console.time("Total save time");

    // Simulated 20-second progress instead of AWS calls
    const steps = [
      { pct: 0, label: "Checking Access...", delay: 0 },
      { pct: 15, label: "Preparing data...", delay: 4000 },
      { pct: 35, label: "Saving your forecast...", delay: 4000 },
      { pct: 55, label: "Processing notes...", delay: 4000 },
      { pct: 75, label: "Finalizing save...", delay: 4000 },
      { pct: 100, label: "Save complete!", delay: 4000 },
    ];

    for (const step of steps) {
      if (step.delay > 0) await new Promise((r) => setTimeout(r, step.delay));
      setPageValue("LoadingCircleComponent", `${step.pct}% | ${step.label}`);
    }

    const msg = `Forecast scenario saved for\nModel: ${heading.replace(
      "Save Scenario for: ",
      ""
    )}\nCycle: ${selectedCycle}\nScenario: ${scenarioName}`;
    setPageValue("SuccessMessagePage", msg);

    console.timeEnd("Total save time");
  }, [
    selectedCycle,
    scenarioName,
    setPageValue,
    heading,
  ]);

  const handleDetailedNotesYes = () => {
    setShowDetailedNotesPrompt(false);
    proceedWithSave();
  };

  const handleDetailedNotesNo = () => {
    setShowDetailedNotesPrompt(false);
  };

  const handleNotesPromptOk = () => {
    setShowNotesPrompt(false);
  };

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
            <DetailedNotesButton onClick={() => setShowDetailedNotes(true)} type="button" style={{ border: "1px solid #bd302b" }}>
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
              <DetailedNoteLabel>Market Share</DetailedNoteLabel>
              <DetailedTextArea
                placeholder="-"
                value={detailedNotes.marketShareAssumptions}
                onChange={(e) => handleDetailedNoteChange("marketShareAssumptions", e.target.value)}
              />
            </DetailedNoteField>

            <DetailedNoteField>
              <DetailedNoteLabel>Persistency & Dosing</DetailedNoteLabel>
              <DetailedTextArea
                placeholder="-"
                value={detailedNotes.patientConversion}
                onChange={(e) => handleDetailedNoteChange("patientConversion", e.target.value)}
              />
            </DetailedNoteField>

            <DetailedNoteField>
              <DetailedNoteLabel>Compliance & Access</DetailedNoteLabel>
              <DetailedTextArea
                placeholder="-"
                value={detailedNotes.demandConversion}
                onChange={(e) => handleDetailedNoteChange("demandConversion", e.target.value)}
              />
            </DetailedNoteField>

            <DetailedNoteField>
              <DetailedNoteLabel>WAC & GTN</DetailedNoteLabel>
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

      {/* Prompt: Add Detailed Notes? */}
      {showDetailedNotesPrompt && (
        <Overlay>
          <Modal>
            <ModalHeader>Add Detailed Notes?</ModalHeader>
            <ModalBody>
              Detailed notes are not included. Would you like to proceed with saving?
            </ModalBody>
            <ModalFooter>
              <ConfirmButton onClick={handleDetailedNotesYes}>Yes</ConfirmButton>
              <ConfirmButton
                style={{ backgroundColor: "#63666A" }}
                onClick={handleDetailedNotesNo}
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

export default SaveScenario;
