import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Heading,
  MessageBox,
  DropdownContainer,
  SelectDropdown,
  Input,
  SaveButton,
  ForecasterNotesSection,
  NotesLabel,
  NotesTextArea,
  DetailedNotesButton,
} from "./SaveForecastPageStyles";
import { DataFrame } from "dataframe-js";
import * as AWSconnections from "../../Middleware/AWSConnections";
import * as excelfunctions from "../../Middleware/ExcelConnection";
import { specialModelIds } from "../../Middleware/Model Config";
import CONFIG from "../../Middleware/AWSConnections";

const SaveScenario = ({ 
  setPageValue,
  epidemiologyNotes,
  setEpidemiologyNotes,
  marketShareNotes,
  setMarketShareNotes,
  patientConversionNotes,
  setPatientConversionNotes,
  demandConversionNotes,
  setDemandConversionNotes,
  revenueConversionNotes,
  setRevenueConversionNotes
}) => {
  // ─── State ────────────────────────────────────────────────────────────────
  const [selectedCycle, setSelectedCycle] = useState("");
  const [scenarioName, setScenarioName] = useState("");
  const [saveInterimToPowerBI, setSaveInterimToPowerBI] = useState(false);
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
  const [forecasterNotes, setForecasterNotes] = useState("");

  // ─── Build scenario lookup ────────────────────────────────────────────────
  const scenarioSet = useMemo(() => {
    const df = dataFrames.dfResult1;
    if (!df) return new Set();
    return new Set(
      df.toCollection().map((r) =>
        `${r.model_id}|${r.cycle_name}|${r.scenario_name
          .toString()
          .trim()
          .toLowerCase()}`
      )
    );
  }, [dataFrames.dfResult1]);

  const checkScenarioExists = useCallback(
    (modelId, cycleName, name) => {
      if (!dataFrames.dfResult1) return false;
      return scenarioSet.has(
        `${modelId}|${cycleName}|${name.trim().toLowerCase()}`
      );
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

        setHeading(`Save Scenario for: ${ranges.ModelName.values[0][0]}`);
        setModelIDValue(ranges.ModelID.values[0][0]);
        setModelType(ranges.ModelType.values[0][0]);
        setIsOutputSheet(true);

        if (ranges.ModelType.values[0][0] === "AGGREGATOR") {
          setPageValue(
            "AggSaveScenario",
            "Loading scenario for Aggregator model..."
          );
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
        await Promise.all([
          checkofCloudBackendSheet(),
          fetchDataFromLambda(),
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, [checkofCloudBackendSheet, fetchDataFromLambda]);

  // ─── Validate access ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && modelIDValue && dataFrames.dfResult3) {
      const ok = dataFrames.dfResult3
        .toCollection()
        .some((m) => m.model_id === modelIDValue);
      if (!ok) {
        setModelIDError(
          "Access to current model is not authorized. Please reach out to support team."
        );
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

            if (/^scenario name:/i.test(line))
              setScenarioName(line.split(/scenario name:/i)[1].trim());
          });
        }
      })
      .catch(() => { });
  }, [isOutputSheet]);

  // ─── Add Detailed Notes handler ───────────────────────────────────────────
  const handleAddDetailedNotes = useCallback(() => {
    // Navigate to the DetailedNotesPage
    setPageValue("DetailedNotesPage");
  }, [setPageValue]);

  // ─── Save handler ─────────────────────────────────────────────────────────
  const handleSaveClick = useCallback(async () => {
    console.time("Total save time");
    setPageValue("LoadingCircleComponent", "0% | Checking Access...");

    // 1. Permission
    const access = await AWSconnections.ButtonAccess("SAVE_FORECAST");
    if (access?.message === "ACCESS DENIED") {
      setPageValue(
        "SaveForecastPageinterim",
        "You do not have permission to save forecast."
      );
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
      setPageValue(
        "SaveForecastPageinterim",
        "Scenario name already exists… choose a different one."
      );
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
      longformData = await excelfunctions.generateLongFormData(
        "US",
        "DataModel"
      );
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

<<<<<<< HEAD
      if (specialModelIds.includes(modelIDValue)) {
        longformData = await excelfucntions.generateLongFormData(
          "US",
          "DataModel"
        );
        await excelfucntions.saveData();
      } else {
        const [lf, , ob] = await Promise.all([
          excelfucntions.generateLongFormData("US", "DataModel"),
          excelfucntions.saveData(),
          excelfucntions.readNamedRangeToArray("aggregator_data"),
        ]);
        longformData = lf;
        outputbackend_data = ob;
      }

      setPageValue("LoadingCircleComponent", "75% | Saving your forecast…");

      // const saveFlag = await AWSconnections.service_orchestration(
      //   "SAVE_FORECAST",
      //   "",
      //   modelIDValue,
      //   scenarioName,
      //   selectedCycle,
      //   "",
      //   "",
      //   "",
      //   longformData,
      //   outputbackend_data,
      //   [],
      //   [],
      //   [],
      //   setPageValue
      // );
      const saveFlag = "SUCCESS" ;
=======
    // 5. Orchestrate
    let saveFlag, strippedForecastId = null;
    setPageValue("LoadingCircleComponent", "75% | Saving your forecast...");
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
        setPageValue
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
        setPageValue
      );
    }
>>>>>>> 186b0751b0eaa754a52d934a588f7c064ce018aa

    // 6. Finalize
    const msg = `Forecast scenario saved for\nModel: ${heading.replace(
      "Save Scenario for: ",
      ""
    )}\nCycle: ${selectedCycle}\nScenario: ${scenarioName}`;
    if (saveFlag === "SUCCESS" || saveFlag?.result === "DONE") {
      setPageValue("SuccessMessagePage", msg);
      const statusLabel = saveInterimToPowerBI ? "Interim + BI" : "Interim";


      await AWSconnections.writeMetadataToNamedCell(
        "last_scn_update",
        selectedCycle,
        scenarioName,
        statusLabel
      );
      await excelfunctions.setCalculationMode("automatic");
      console.log("strippedForecastId:", strippedForecastId);
    } else {
      setPageValue(
        "SaveForecastPageinterim",
        "Some error occurred while saving, please try again"
      );
    }

    console.timeEnd("Total save time");
  }, [
    dataFrames.dfResult1,
    modelIDValue,
    selectedCycle,
    scenarioName,
    saveInterimToPowerBI,
    setPageValue,
    heading,
  ]);

  // ─── Render / early returns ────────────────────────────────────────────────
  if (loading)
    return <MessageBox>Connecting to data lake, please wait…</MessageBox>;
  if (modelIDError) return <MessageBox>{modelIDError}</MessageBox>;
  if (!isOutputSheet)
    return (
      <MessageBox>
        Current workbook is not a compatible forecast model. Please open the latest
        ADC models to use this feature.
      </MessageBox>
    );

  const isDisabled = !selectedCycle || !scenarioName;

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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          alignSelf: "flex-start",
          margin: "0.2rem 0",
        }}
      >
        <input
          id="saveInterimToPowerBI"
          type="checkbox"
          checked={saveInterimToPowerBI}
          onChange={(e) => setSaveInterimToPowerBI(e.target.checked)}
          style={{ accentColor: saveInterimToPowerBI ? "green" : undefined }}
        />
        <label htmlFor="saveInterimToPowerBI" style={{ marginLeft: "0.5rem" }}>
          Save interim to PowerBI
        </label>
      </div>

      <ForecasterNotesSection>
        <NotesLabel>Forecaster Notes</NotesLabel>
        <NotesTextArea
          placeholder="Updated the share assumptions and pushed the launch date ahead by 3 months."
          value={forecasterNotes}
          onChange={(e) => setForecasterNotes(e.target.value)}
        />
        <DetailedNotesButton onClick={handleAddDetailedNotes}>
          Add Detailed Notes
        </DetailedNotesButton>
      </ForecasterNotesSection>

      <SaveButton
        onClick={handleSaveClick}
        disabled={isDisabled}
        style={
          isDisabled
            ? { backgroundColor: "#ccc", cursor: "not-allowed" }
            : {}
        }
      >
        Save
      </SaveButton>
    </Container>
  );
};

export default SaveScenario;
