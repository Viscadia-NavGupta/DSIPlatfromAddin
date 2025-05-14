import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Heading,
  MessageBox,
  DropdownContainer,
  SelectDropdown,
  Input,
  SaveButton,
} from "./SaveForecastPageStyles";
import { DataFrame } from "dataframe-js";
import * as AWSconnections from "../../Middleware/AWSConnections";
import * as excelfucntions from "../../Middleware/ExcelConnection";
import * as inputfiles from "../../Middleware/inputfile";
import CONFIG from "../../Middleware/AWSConnections";

const SaveScenario = ({ setPageValue }) => {
  const [selectedCycle, setSelectedCycle] = useState("");
  const [scenarioName, setScenarioName] = useState("");
  const [heading, setHeading] = useState("Active Sheet Name");
  const [isOutputSheet, setIsOutputSheet] = useState(false);
  const storedUsername = useMemo(() => sessionStorage.getItem("username"), []);
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

          Object.values(ranges).forEach((range) => range.load("values"));
          await context.sync();

          const ModelNameValue = ranges.ModelName.values[0][0]?.toString().trim() || "";
          const ModelIDValue = ranges.ModelID.values[0][0]?.toString().trim() || "";
          const ModelTypeValue = ranges.ModelType.values[0][0]?.toString().trim() || "";

          console.log("🔍 Extracted Model Values:", {
            ModelNameValue,
            ModelIDValue,
            ModelTypeValue,
          });

          if (!ModelNameValue || !ModelIDValue || !ModelTypeValue) {
            console.warn("⚠️ One or more required model values are blank.");
            setIsOutputSheet(false);
            return;
          }

          setHeading(`Save Scenario for: ${ModelNameValue}`);
          setModelIDValue(ModelIDValue);
          setModelType(ModelTypeValue);
          setIsOutputSheet(true);

          if (ModelTypeValue === "AGGREGATOR") {
            setPageValue("AggSaveScenario", "Loading scenario for Aggregator model...");
          }
        } else {
          console.log("⚠️ No Output Sheet Found.");
          setIsOutputSheet(false);
        }
      });
    } catch (error) {
      console.error("🚨 Error checking for Outputs sheet:", error);
      setIsOutputSheet(false);
    }
  }, [setPageValue]);

  const fetchDataFromLambda = useCallback(async () => {
    try {
      console.log("📤 Fetching Data from Lambda...");
      const responseBody = await AWSconnections.FetchMetaData(
        "FETCH_METADATA",
        localStorage.getItem("idToken"),
        CONFIG.AWS_SECRETS_NAME,
        localStorage.getItem("User_ID"),
        localStorage.getItem("username")
      );

      if (!responseBody || !responseBody.results1 || !responseBody.results2 || !responseBody.result3) {
        throw new Error("❌ Missing one or more required results in Lambda response.");
      }

      const df1 = new DataFrame(responseBody.results1);
      const df2 = new DataFrame(responseBody.results2);
      const df3 = new DataFrame(responseBody.result3);

      setDataFrames({
        dfResult1: df1,
        dfResult2: df2,
        dfResult3: df3,
      });

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

  useEffect(() => {
    const initializePage = async () => {
      try {
        await Promise.all([checkofCloudBackendSheet(), fetchDataFromLambda()]);
      } catch (error) {
        console.error("🚨 Initialization failed:", error);
      } finally {
        console.log("🔄 Finished init, setting loading to false");
        setLoading(false);
      }
    };

    initializePage();
  }, [checkofCloudBackendSheet, fetchDataFromLambda]);

  useEffect(() => {
    console.log("🔄 Running model ID check...");
    console.log("Values:", { loading, modelIDValue, df3: !!dataFrames.dfResult3 });

    if (!loading && modelIDValue && dataFrames.dfResult3) {
      const models = dataFrames.dfResult3.toCollection();
      console.log("Models from dfResult3:", models);

      const authorized = models.some((model) => model.model_id === modelIDValue);
      if (!authorized) {
        console.warn("🚨 No authorized model detected");
        setModelIDError("Model ID mismatch. The current model is not authorized.");
        setIsOutputSheet(false);
      } else {
        setModelIDError("");
        console.log("✅ Authorized model detected");
      }
    }
  }, [loading, modelIDValue, dataFrames.dfResult3]);

  const handleSaveClick = useCallback(async () => {
    console.time("Total save time request");
    setPageValue("LoadingCircleComponent", "0% | Saving your forecast...");

    console.log("📤 Saving Forecast:", {
      cycle_name: selectedCycle,
      scenario_name: scenarioName,
    });
    console.log("🔹 Using Model ID:", modelIDValue);
    console.log("🔹 Using Model Type:", modelType);

    if (checkScenarioExists(modelIDValue, selectedCycle, scenarioName)) {
      console.log("This scenario combination already exists.");
      setPageValue(
        "SaveForecastPageinterim",
        "Scenario names already exist in the database. Please choose a different scenario name."
      );
      return;
    }

    try {
      await excelfucntions.setCalculationMode("manual");
      console.time("Parallel processes");

      const [longformData, inputfile, outputbackend_data] = await Promise.all([
        excelfucntions.generateLongFormData("US", "DataModel"),
        inputfiles.saveData(),
        excelfucntions.readNamedRangeToArray("aggregator_data"),
      ]);
      
      const modelsMap = new Map();
      dataFrames.dfResult3.toCollection().forEach(model => {
        modelsMap.set(model.model_id, model);
      });
      const matchedModel = modelsMap.get(modelIDValue);
      console.timeEnd("Parallel processes");
      setPageValue("LoadingCircleComponent", "75% | Saving your forecast...");
     
      console.time("save forecast");
      const saveFlag = await AWSconnections.service_orchestration(
        "SAVE_FORECAST",
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
        matchedModel
      );
      console.timeEnd("save forecast");

      console.log("Save response:", saveFlag);
      setPageValue("LoadingCircleComponent", "100% | Saving your forecast...");

      if (saveFlag === "Saved Forecast" || (saveFlag && saveFlag.result === "DONE")) {
        const message = `Forecast scenario saved for model: ${heading.replace("Save Scenario for:", "")} | Cycle: ${selectedCycle} | Scenario: ${scenarioName}`;
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
        setPageValue("SaveForecastPageinterim", "Some Error Occurred, Please try again");
      }
    } catch (error) {
      console.error("Error during save process:", error);
      setPageValue("SaveForecastPageinterim", "An error occurred during save");
    }

    console.timeEnd("Total save time request");
  }, [selectedCycle, scenarioName, modelIDValue, modelType, checkScenarioExists, setPageValue]);

  return (
    <Container>
      {loading ? (
        <MessageBox>Checking cloud compatibility, please wait...</MessageBox>
      ) : modelIDError ? (
        <MessageBox>{modelIDError}</MessageBox>
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
        <MessageBox>No authorized output sheet or model found. Please refresh the add-in.</MessageBox>
      )}
    </Container>
  );
};

export default SaveScenario;
