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
  SectionLabel,
  TextArea,
  CharacterCount,
  DetailedNotesButton,
  DetailedNotesContainer,
  DetailedNoteField,
  DetailedNoteLabel,
  DetailedTextArea,
  BackButton,
  NotesWrapper,
  BackButtonContainer,
  DetailedHeading,
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);
  const [showNotesPrompt, setShowNotesPrompt] = useState(false);
  const [showDetailedNotesPrompt, setShowDetailedNotesPrompt] = useState(false);
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

      // Exclude "ACTUALS" (case-insensitive) from cycle dropdown
      const cycles = new DataFrame(resp.results2)
        .distinct("cycle_name")
        .toArray()
        .map((r) => (r[0] ?? "").toString().trim())
        .filter((cycle) => cycle.toUpperCase() !== "ACTUALS");

      setCycleItems(cycles);
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

    // Check for duplicate scenario names first
    if (checkScenarioExists(modelIDValue, selectedCycle, scenarioName)) {
      setPageValue(
        "SaveForecastPageinterim",
        "Scenario names already exist… choose a different one."
      );
      return;
    }

    const lockedExists = checkLockedScenarioExists(modelIDValue, selectedCycle);
    if (lockedExists) {
      setShowOverwriteWarning(true);
    } else {
      setShowConfirm(true);
    }
  }, [forecasterNotes, detailedNotes, checkScenarioExists, checkLockedScenarioExists, modelIDValue, selectedCycle, scenarioName, setPageValue]);

  const proceedWithSave = useCallback(async () => {
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

    try {
      await excelfucntions.setCalculationMode("manual");
      setPageValue("LoadingCircleComponent", "0% | Saving your forecast...");

      const [longformData] = await Promise.all([
        excelfucntions.generateLongFormData("US", "DataModel"),
        excelfucntions.saveData(),
      ]);

      setPageValue("LoadingCircleComponent", "75% | Saving your forecast...");

      // Create notes JSON body for Lambda API
      const notesBody = {
        forecaster_notes: forecasterNotes,
        epidemiology: detailedNotes.epidemiology,
        market_share_assumptions: detailedNotes.marketShareAssumptions,
        patient_conversion: detailedNotes.patientConversion,
        demand_conversion: detailedNotes.demandConversion,
        revenue_conversion: detailedNotes.revenueConversion,
      };
      console.log("notes:", JSON.stringify(notesBody, null, 2));

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

      const message = `Forecast scenario saved for
Model: ${heading.replace("Save & Lock Scenario for:", "")}
Cycle: ${selectedCycle}
Scenario: ${scenarioName}`;

      if (saveFlag === "SUCCESS" || (saveFlag && saveFlag.result === "DONE")) {
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
            epidemiology: detailedNotes.epidemiology,
            market_share: detailedNotes.marketShareAssumptions,
            patient_conversion: detailedNotes.patientConversion,
            demand_conversion: detailedNotes.demandConversion,
            revenue_conversion: detailedNotes.revenueConversion,
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

        await AWSconnections.writeMetadataToNamedCell(
          "last_scn_update",
          selectedCycle,
          scenarioName,
          "Locked"
        );
        setPageValue("SuccessMessagePage", message);
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
  }, [forecasterNotes, detailedNotes, heading, modelIDValue, scenarioName, selectedCycle, setPageValue]);

  const handleSaveConfirmed = useCallback(async () => {
    setShowConfirm(false);
    await proceedWithSave();
  }, [proceedWithSave]);

  const handleCancel = () => setShowConfirm(false);
  const handleDetailedNotesYes = () => {
    setShowDetailedNotesPrompt(false);
    
    // Check for duplicate scenario names first
    if (checkScenarioExists(modelIDValue, selectedCycle, scenarioName)) {
      setPageValue(
        "SaveForecastPageinterim",
        "Scenario names already exist… choose a different one."
      );
      return;
    }
    
    const lockedExists = checkLockedScenarioExists(modelIDValue, selectedCycle);
    if (lockedExists) {
      setShowOverwriteWarning(true);
    } else {
      setShowConfirm(true);
    }
  };
  const handleDetailedNotesNo = () => setShowDetailedNotesPrompt(false);
  const handleNotesPromptOk = () => setShowNotesPrompt(false);
  const handleDetailedNoteChange = (field, value) => {
    setDetailedNotes((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

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

  const maxCharacters = 500;
  const remainingCharacters = maxCharacters - forecasterNotes.length;

  return (
    <Container>
      {!showDetailedNotes ? (
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
            disabled={!selectedCycle || !scenarioName}
          >
            Save & Lock
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
            disabled={!selectedCycle || !scenarioName}
          >
            Save & Lock
          </SaveButton>
        </>
      )}

      {showConfirm && (
        <Overlay>
          <Modal>
            <ModalHeader>You are locking a scenario</ModalHeader>
            <ModalBody>
              Please confirm you want to lock “{scenarioName}” on cycle “{selectedCycle}”.
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
              A scenario is already locked for cycle “{lockedScenarioInfo?.cycleName}” and Scenario Name: “{lockedScenarioInfo?.scenarioName}”
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

export default SaveandLockScenario;
