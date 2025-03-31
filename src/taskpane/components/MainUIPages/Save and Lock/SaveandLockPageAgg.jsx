import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Heading,
  MessageBox,
  DropdownContainer,
  SelectDropdown,
  Input,
  SaveButton,
} from "./SaveandLockPageStylesagg";
import { DataFrame } from "dataframe-js";
import * as AWSconnections from "../../Middleware/AWSConnections";
import * as excelfucntions from "../../Middleware/ExcelConnection";
import * as inputfiles from "../../Middleware/inputfile";

const AggLockScenario = ({ setPageValue }) => {
  // =============================================================================
  //                              STATE VARIABLES
  // =============================================================================
  const [selectedCycle, setSelectedCycle] = useState("");
  const [scenarioName, setScenarioName] = useState("");
  const [heading, setHeading] = useState("Active Sheet Name");
  const [isOutputSheet, setIsOutputSheet] = useState(false);
  const storedUsername = useMemo(() => sessionStorage.getItem("username"), []);
  const [cycleItems, setCycleItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modelIDValue, setModelIDValue] = useState("");
  const [modelType, setModelType] = useState("");
  // NEW: State to store values from the "Cloud_LoadModels_List" named range.
  const [cloudLoadModelsList, setCloudLoadModelsList] = useState([]);

  // DataFrames state from Lambda fetch
  const [dataFrames, setDataFrames] = useState({
    dfResult1: null,
    dfResult2: null,
    dfResult3: null,
  });

  // =============================================================================
  //                       HELPER FUNCTIONS & CALLBACKS
  // =============================================================================

  // Checks if the provided combination already exists in the primary result set.
  const checkScenarioExists = useCallback(
    (modelId, cycleName, scenarioName) => {
      const { dfResult1 } = dataFrames;
      if (!dfResult1) {
        console.warn("Result1 DataFrame is not loaded yet.");
        return false;
      }
      const records = dfResult1.toCollection();
      return records.some(
        (record) =>
          record.model_id === modelId && record.cycle_name === cycleName && record.scenario_name === scenarioName
      );
    },
    [dataFrames]
  );

  // Reads Excel cell values from the "cloud_backend_md" sheet.
  // Also reads the named range "Cloud_LoadModels_List" and stores its values in state.
  const checkofCloudBackendSheet = useCallback(async () => {
    try {
      console.log("📊 Checking for Output Sheet...");
      if (typeof window.Excel === "undefined") {
        console.error("🚨 Excel API is not available.");
        return;
      }
      await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        sheets.load("items/name");
        await context.sync();

        const MetaDataSheet = sheets.items.find((sheet) => sheet.name.toLowerCase() === "cloud_backend_md");

        if (MetaDataSheet) {
          const sheet = MetaDataSheet;
          const ranges = {
            ModelName: sheet.getRange("B5"),
            ModelID: sheet.getRange("B7"),
            ModelType: sheet.getRange("B8"),
          };

          // Load all ranges together.
          Object.values(ranges).forEach((range) => range.load("values"));

          // Get the named range "Cloud_LoadModels_List" and load its values.
          const cloudLoadModelsName = context.workbook.names.getItem("Cloud_LoadModels_List");
          const cloudLoadModelsRange = cloudLoadModelsName.getRange();
          cloudLoadModelsRange.load("values");

          await context.sync();

          const ModelNameValue = ranges.ModelName.values[0][0] || "";
          const ModelIDValue = ranges.ModelID.values[0][0] || "";
          const ModelTypeValue = ranges.ModelType.values[0][0] || "";
          // The named range returns a 2D array.
          const loadedCloudLoadModelsList = cloudLoadModelsRange.values;

          setHeading(`Save Aggregator Scenario for: ${ModelNameValue}`);
          setIsOutputSheet(true);
          setModelIDValue(ModelIDValue);
          setModelType(ModelTypeValue);
          setCloudLoadModelsList(loadedCloudLoadModelsList);

          console.log("✅ Output Sheet Found:", ModelNameValue, ModelIDValue, ModelTypeValue);
          console.log("✅ Cloud_LoadModels_List:", loadedCloudLoadModelsList);
        } else {
          console.log("⚠️ No Output Sheet Found.");
          setIsOutputSheet(false);
        }
      });
    } catch (error) {
      console.error("🚨 Error checking for Outputs sheet:", error);
      setIsOutputSheet(false);
    }
  }, []);

  // Fetch metadata from Lambda and create DataFrames for further processing.
  const fetchDataFromLambda = useCallback(async () => {
    try {
      console.log("📤 Fetching Data from Lambda...");
      const responseBody = await AWSconnections.FetchMetaData(
        "FETCH_METADATA",
        localStorage.getItem("idToken"),
        "dsivis-dev-remaining-secrets",
        localStorage.getItem("User_ID"),
        localStorage.getItem("username")
      );

      if (!responseBody || !responseBody.results1 || !responseBody.results2 || !responseBody.result3) {
        throw new Error("❌ Missing one or more required results in Lambda response.");
      }

      // Create DataFrames for each result.
      const df1 = new DataFrame(responseBody.results1);
      const df2 = new DataFrame(responseBody.results2);
      const df3 = new DataFrame(responseBody.result3);

      setDataFrames({
        dfResult1: df1,
        dfResult2: df2,
        dfResult3: df3,
      });

      // Extract distinct cycle names from df2.
      const cycleItemsArray = df2
        .distinct("cycle_name")
        .toArray()
        .map((row) => row[0]);

      console.log("Cycle Items:", cycleItemsArray);
      setCycleItems(cycleItemsArray);
    } catch (error) {
      console.error("🚨 Error fetching data from Lambda:", error);
    }
  }, []);

  // =============================================================================
  //                      AUTHORIZATION CHECK (MODEL ID MATCH)
  // =============================================================================

  // Once loading is complete and we have the metadata and the Excel model ID,
  // check if the modelID from Excel (modelIDValue) is present in result3.
  useEffect(() => {
    if (!loading && modelIDValue && dataFrames.dfResult3) {
      const models = dataFrames.dfResult3.toCollection(); // Array of objects from result3.
      const authorized = models.some((model) => model.model_id === modelIDValue);
      if (!authorized) {
        console.warn("🚨 No authorized model detected");
        setIsOutputSheet(false);
      } else {
        console.log("✅ Authorized model detected");
      }
    }
  }, [loading, modelIDValue, dataFrames.dfResult3]);

  // =============================================================================
  //                               USE EFFECTS
  // =============================================================================

  useEffect(() => {
    const initializePage = async () => {
      try {
        // Run initialization tasks concurrently.
        await Promise.all([checkofCloudBackendSheet(), fetchDataFromLambda()]);
      } catch (error) {
        console.error("🚨 Initialization failed:", error);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [checkofCloudBackendSheet, fetchDataFromLambda]);

  // =============================================================================
  //                                EVENT HANDLERS
  // =============================================================================

  const handleSaveClick = useCallback(async () => {
    console.time("Total save time request");
    setPageValue("LoadingCircleComponent", "0% | Saving your forecast...");

    console.log("📤 Saving Forecast:", {
      cycle_name: selectedCycle,
      scenario_name: scenarioName,
    });
    console.log("🔹 Using Model ID:", modelIDValue);
    console.log("🔹 Using Model Type:", modelType);
    let concatenatedArray;
    // Concatenate column 1 and column 7 from cloudLoadModelsList with a hyphen in between.
    if (cloudLoadModelsList && cloudLoadModelsList.length > 0) {
       concatenatedArray = cloudLoadModelsList.map((row) => {
        // Assuming the named range returns a 2D array and using 1-indexed columns:
        // Column 1 -> index 0 and Column 7 -> index 6.
        if (row.length >= 7) {
          return `${row[0]} - ${row[6]}`;
        }
        return "";
      });
      console.log("Concatenated Columns (1 & 7):", concatenatedArray);
    } else {
      console.log("No Cloud_LoadModels_List data available.");
    }

    if (checkScenarioExists(modelIDValue, selectedCycle, scenarioName)) {
      console.log("This scenario combination already exists.");
      setPageValue("SaveForecastPageinterim", "Scenario name already in use");
      return;
    }

    try {
      await excelfucntions.setCalculationMode("manual");
      console.time("Parallel processes");

      const [longformData, _] = await Promise.all([
        excelfucntions.generateLongFormData("US", "DataModel"),
        inputfiles.saveData(),
      ]);

      console.timeEnd("Parallel processes");
      setPageValue("LoadingCircleComponent", "75% | Saving your forecast...");

      console.time("save forecast");
      const saveFlag = await AWSconnections.service_orchestration(
        "SAVE_FORECAST_AGG",
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
        concatenatedArray
      );
      console.timeEnd("save forecast");

      console.log("Save response:", saveFlag);
      setPageValue("LoadingCircleComponent", "100% | Saving your forecast...");

      if (saveFlag === "Saved Forecast" || (saveFlag && saveFlag.result === "DONE")) {
        setPageValue("SaveForecastPageinterim", "Forecast Scenario saved");
      } else if (
        saveFlag ===
        "A scenario of this name for the provided model and cycle details already exists, try with another one."
      ) {
        setPageValue("SaveForecastPageinterim", "Scenario name already in use");
      } else if (saveFlag && saveFlag.result === "ERROR") {
        setPageValue("SaveForecastPageinterim", "Some Error Occurred, Please try again");
      }
    } catch (error) {
      console.error("Error during save process:", error);
      setPageValue("SaveForecastPageinterim", "An error occurred during save");
    }

    console.timeEnd("Total save time request");
  }, [selectedCycle, scenarioName, modelIDValue, modelType, cloudLoadModelsList, checkScenarioExists, setPageValue]);

  // =============================================================================
  //                                 RENDER
  // =============================================================================

  return (
    <Container>
      {loading ? (
        <MessageBox>Loading, please wait...</MessageBox>
      ) : isOutputSheet ? (
        <>
          <Heading>{heading}</Heading>
          <DropdownContainer>
            <SelectDropdown value={selectedCycle} onChange={(e) => setSelectedCycle(e.target.value)}>
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
              onChange={(e) => setScenarioName(e.target.value)}
            />
          </DropdownContainer>
          <SaveButton onClick={handleSaveClick} disabled={!selectedCycle || !scenarioName}>
            Save
          </SaveButton>
        </>
      ) : (
        <MessageBox>No Authorised model detected, please refresh the addin</MessageBox>
      )}
    </Container>
  );
};

export default AggLockScenario;
