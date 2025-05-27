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
  Button,
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
  const [showConfirm, setShowConfirm] = useState(false);
  const storedUsername = useMemo(() => sessionStorage.getItem("username"), []);
  const [cycleItems, setCycleItems] = useState([]);
  const [loading, setLoading] = useState(true);
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
      const key = `${modelId}|${cycleName}|${scenarioName.trim().toLowerCase()}`;
      return new Set(
        dfResult1
          .toCollection()
          .map(r =>
            `${(r.model_id ?? "").toString()}|${(r.cycle_name ?? "").toString()}|${(r.scenario_name ?? "")
              .toString()
              .trim()
              .toLowerCase()}`
          )
      ).has(key);
    },
    [dataFrames]
  );

  const checkofCloudBackendSheet = useCallback(async () => {
    try {
      if (typeof window.Excel === "undefined") return;
      await Excel.run(async context => {
        const sheets = context.workbook.worksheets;
        sheets.load("items/name");
        await context.sync();

        const MetaDataSheet = sheets.items.find(
          sheet => sheet.name.toLowerCase() === "cloud_backend_md"
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
        Object.values(ranges).forEach(r => r.load("values"));

        const cloudLoadModelsName = context.workbook.names.getItem(
          "Cloud_LoadModels_List"
        );
        const cloudLoadModelsRange = cloudLoadModelsName.getRange();
        cloudLoadModelsRange.load("values");

        await context.sync();

        const ModelNameValue = ranges.ModelName.values[0][0] || "";
        const ModelIDValue = ranges.ModelID.values[0][0] || "";
        const ModelTypeValue = ranges.ModelType.values[0][0] || "";
        const loadedCloudLoadModelsList = cloudLoadModelsRange.values;

        setHeading(
          `Save & Lock Aggregator Scenario for: ${ModelNameValue}`
        );
        setModelIDValue(ModelIDValue);
        setModelType(ModelTypeValue);
        setCloudLoadModelsList(loadedCloudLoadModelsList);
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
        localStorage.getItem("username")
      );

      if (!resp || !resp.results1 || !resp.results2 || !resp.result3) {
        throw new Error("Incomplete metadata");
      }

      const df1 = new DataFrame(resp.results1);
      const df2 = new DataFrame(resp.results2);
      const df3 = new DataFrame(resp.result3);

      setDataFrames({ dfResult1: df1, dfResult2: df2, dfResult3: df3 });
      setCycleItems(
        df2.distinct("cycle_name").toArray().map(r => r[0])
      );
    } catch (error) {
      console.error(error);
    }
  }, []);

  // =============================================================================
  //                          AUTHORIZATION CHECK EFFECT
  // =============================================================================

  useEffect(() => {
    if (!loading && modelIDValue && dataFrames.dfResult3) {
      const authorized = dataFrames.dfResult3
        .toCollection()
        .some(m => m.model_id === modelIDValue);
      if (!authorized) {
        setIsOutputSheet(false);
      }
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
  //                      SAVE CLICK → SHOW MODAL
  // =============================================================================

  const handleSaveClick = useCallback(() => {
    setShowConfirm(true);
  }, []);

  // =============================================================================
  //                   AFTER USER CONFIRMS → ACTUAL SAVE LOGIC
  // =============================================================================

  const handleSaveConfirmed = useCallback(async () => {
    setShowConfirm(false);
    console.time("Total save time request");

    // ── CHECK ACCESS ─────────────────────────────────────────────────────────
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

    // ── SCENARIO‐EXISTS GUARD ───────────────────────────────────────────────
    if (checkScenarioExists(modelIDValue, selectedCycle, scenarioName)) {
      console.log("This scenario combination already exists.");
      setPageValue(
        "SaveForecastPageinterim",
        "Scenario names already exist in the database. Please choose a different scenario name."
      );
      console.timeEnd("Total save time request");
      return;
    }

    // ── ORIGINAL SAVE LOGIC ────────────────────────────────────────────────
    setPageValue("LoadingCircleComponent", "0% | Saving your forecast...");

    const df1 = dataFrames.dfResult1;
    if (!df1) {
      console.error("DataFrame df1 is not loaded yet.");
      return;
    }
    console.log("DataFrame df1 contents:", df1.toCollection());

    const prefixedForecastIds = cloudLoadModelsList.map(
      row => `forecast_${row[6]}`
    );
    console.log("Prefixed Forecast IDs:", prefixedForecastIds);

    const df1Records = df1.toCollection();
    const matchedForecasts = [];
    prefixedForecastIds.forEach(forecastId => {
      const matches = df1Records.filter(
        record => record.forecast_id === forecastId
      );
      matches.forEach(record => {
        matchedForecasts.push({
          model_id: record.model_id,
          forecast_id: record.forecast_id,
        });
      });
    });
    console.log("Matched Forecasts:", matchedForecasts);

    console.log("📤 Saving Forecast:", {
      cycle_name: selectedCycle,
      scenario_name: scenarioName,
    });
    console.log("🔹 Using Model ID:", modelIDValue);
    console.log("🔹 Using Model Type:", modelType);

    let concatenatedArray;
    if (cloudLoadModelsList && cloudLoadModelsList.length > 0) {
      concatenatedArray = cloudLoadModelsList.map(row =>
        row.length >= 7 ? `${row[0]} - ${row[6]}` : ""
      );
      console.log("Concatenated Columns (1 & 7):", concatenatedArray);
    } else {
      console.log("No Cloud_LoadModels_List data available.");
    }

    try {
      await excelfucntions.setCalculationMode("manual");
      console.time("Parallel processes");

      const [longformData, _] = await Promise.all([
        excelfucntions.generateLongFormData("US", "DataModel"),
        inputfiles.saveData(),
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

      console.log("Save response:", saveFlag);
      setPageValue("LoadingCircleComponent", "100% | Saving your forecast...");

      if (
        saveFlag === "SUCCESS" ||
        (saveFlag && saveFlag.result === "DONE")
      ) {
        const message = `Forecast scenario saved & locked for model: ${heading.replace(
          "Save & Lock Aggregator Scenario for: ",
          ""
        )} | Cycle: ${selectedCycle} | Scenario: ${scenarioName}`;
        await AWSconnections.sync_MetaData_AGG(setPageValue);
        excelfucntions.setCalculationMode("automatic");
        setPageValue("SaveForecastPageinterim", message);
      } else if (
        saveFlag ===
        "A scenario of this name for the provided model and cycle details already exists, try with another one."
      ) {
        setPageValue(
          "SaveForecastPageinterim",
          "Scenario names already exist in the database. Please choose a different scenario name."
        );
      } else if (saveFlag && saveFlag.result === "ERROR") {
        setPageValue(
          "SaveForecastPageinterim",
          "Some Error Occurred, Please try again"
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
    }

    console.timeEnd("Total save time request");
  }, [
    selectedCycle,
    scenarioName,
    modelIDValue,
    modelType,
    cloudLoadModelsList,
    checkScenarioExists,
    setPageValue,
    dataFrames,
    heading,
  ]);

  const handleCancel = () => setShowConfirm(false);

  // =============================================================================
  //                                RENDER
  // =============================================================================

  const isDisabled = !selectedCycle || !scenarioName;

  return (
    <Container>
      {loading ? (
        <MessageBox>Checking cloud compatibility, please wait...</MessageBox>
      ) : isOutputSheet ? (
        <>
          <Heading>{heading}</Heading>
          <DropdownContainer>
            <SelectDropdown
              value={selectedCycle}
              onChange={e => setSelectedCycle(e.target.value)}
            >
              <option value="" disabled>
                Select Cycle
              </option>
              {cycleItems.length > 0 ? (
                cycleItems.map((item, idx) => (
                  <option key={idx} value={item}>
                    {item}
                  </option>
                ))
              ) : (
                <option disabled>No Cycles Available</option>
              )}
            </SelectDropdown>
            <Input
              type="text"
              placeholder="Enter Scenario Name"
              value={scenarioName}
              onChange={e => setScenarioName(e.target.value)}
            />
          </DropdownContainer>
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

          {showConfirm && (
            <Overlay>
              <Modal>
                <ModalHeader>Lock this scenario?</ModalHeader>
                <ModalBody>
                  Please confirm you want to lock “{scenarioName}” on cycle “
                  {selectedCycle}”.
                </ModalBody>
                <ModalFooter>
                  <Button onClick={handleSaveConfirmed}>Yes</Button>
                  <Button onClick={handleCancel}>No</Button>
                </ModalFooter>
              </Modal>
            </Overlay>
          )}
        </>
      ) : (
        <MessageBox>
          No Authorised model detected, please refresh the add-in
        </MessageBox>
      )}
    </Container>
  );
};

export default AggLockScenario;
