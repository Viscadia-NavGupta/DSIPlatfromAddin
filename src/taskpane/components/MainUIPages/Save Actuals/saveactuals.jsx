import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Container, Heading, MessageBox, DropdownContainer, Input, SaveButton } from "./saveactualsstyles";
import { DataFrame } from "dataframe-js";
import * as AWSconnections from "../../Middleware/AWSConnections";
import * as excelfucntions from "../../Middleware/ExcelConnection";
import * as inputfiles from "../../Middleware/inputfile";
import * as Excelconnections from "../../Middleware/ExcelConnection"; // Ensure this import exists

const SaveScenarioActuals = ({ setPageValue }) => {
  const [scenarioName, setScenarioName] = useState("");
  const [heading, setHeading] = useState("Active Sheet Name");
  const [isOutputSheet, setIsOutputSheet] = useState(false);
  const storedUsername = useMemo(() => sessionStorage.getItem("username"), []);
  const [loading, setLoading] = useState(true);
  const [modelIDValue, setModelIDValue] = useState("");
  const [modelType, setModelType] = useState("");

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
            ModelName: sheet.getRange("B16"),
            ModelID: sheet.getRange("B18"),
            ModelType: sheet.getRange("B19"),
          };

          Object.values(ranges).forEach((range) => range.load("values"));
          await context.sync();

          const ModelNameValue = ranges.ModelName.values[0][0] || "";
          const ModelIDValue = ranges.ModelID.values[0][0] || "";
          const ModelTypeValue = ranges.ModelType.values[0][0] || "";

          setHeading(`Save Scenario for: ${ModelNameValue}`);
          setIsOutputSheet(true);
          setModelIDValue(ModelIDValue);
          setModelType(ModelTypeValue);

          console.log("✅ Output Sheet Found:", ModelNameValue, ModelIDValue, ModelTypeValue);

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
        "DSI-prod-remaining-secrets",
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
        setLoading(false);
      }
    };
    initializePage();
  }, [checkofCloudBackendSheet, fetchDataFromLambda]);

  useEffect(() => {
    if (!loading && modelIDValue && dataFrames.dfResult3) {
      const models = dataFrames.dfResult3.toCollection();
      const authorized = models.some((model) => model.model_id === modelIDValue);
      if (!authorized) {
        console.warn("🚨 No authorized model detected");
        setIsOutputSheet(false);
      } else {
        console.log("✅ Authorized model detected");
      }
    }
  }, [loading, modelIDValue, dataFrames.dfResult3]);

  function excelSerialToJSDate(serial) {
    const excelEpoch = new Date(1899, 11, 30); // Excel starts from Dec 30, 1899
    return new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
  }

  function formatToMMMYY(date) {
    const options = { month: "short", year: "2-digit" };
    return new Intl.DateTimeFormat("en-US", options).format(date).replace(" ", "-");
  }

  const handleSaveClick = useCallback(async () => {
    console.time("Total save time request");
    setPageValue("LoadingCircleComponent", "0% | Saving your actuals...");

    if (checkScenarioExists(modelIDValue, "ACTUALS", scenarioName)) {
      console.log("This scenario combination already exists.");
      setPageValue("SaveForecastPageinterim", "Actuals Scenario name already in use");
      return;
    }

    try {
      await excelfucntions.setCalculationMode("manual");
      console.time("Parallel processes");

      const [longformData, _, outputbackend_data] = await Promise.all([
        excelfucntions.generateLongFormData("US", "DataModel_Actuals"),
      ]);

      console.timeEnd("Parallel processes");
      setPageValue("LoadingCircleComponent", "75% | Saving your actuals...");

      const actualsLastDateRaw = await Excelconnections.readNamedRangeToArray("actuals_last_month");
      const rawSerial = actualsLastDateRaw[0][0];
      const convertedDate = excelSerialToJSDate(rawSerial);
      const formattedActualsDate = formatToMMMYY(convertedDate);

      const saveFlag = await AWSconnections.service_orchestration(
        "SAVE_ACTUALS",
        "",
        modelIDValue,
        scenarioName,
        "ACTUALS",
        "",
        "",
        "",
        longformData,
        outputbackend_data
      );

      setPageValue("LoadingCircleComponent", "100% | Saving your forecast...");

      const modelName = heading.replace("Save Scenario for: ", "");
      const message = `Actual's Scenario saved for Model: ${modelName} | Actuals Till: ${formattedActualsDate} | Scenario: ${scenarioName}`;

      if (saveFlag === "Saved Forecast" || saveFlag?.result === "DONE" || saveFlag === "Saved Locked Forecast") {
        setPageValue("SaveForecastPageinterim", message);
      } else if (
        saveFlag ===
        "A scenario of this name for the provided model and cycle details already exists, try with another one."
      ) {
        setPageValue("SaveForecastPageinterim", "Actuals scenario name already in use");
      } else if (saveFlag?.result === "ERROR") {
        setPageValue("SaveForecastPageinterim", "Some Error Occurred, Please try again");
      }
    } catch (error) {
      console.error("Error during save process:", error);
      setPageValue("SaveForecastPageinterim", "An error occurred during save");
    }

    console.timeEnd("Total save time request");
  }, [scenarioName, modelIDValue, modelType, checkScenarioExists, setPageValue, heading]);

  return (
    <Container>
      {loading ? (
        <MessageBox>Loading, please wait...</MessageBox>
      ) : isOutputSheet ? (
        <>
          <Heading>{heading}</Heading>
          <DropdownContainer>
            <Input
              type="text"
              placeholder="Enter Scenario Name"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
            />
          </DropdownContainer>
          <SaveButton onClick={handleSaveClick} disabled={!scenarioName}>
            Save
          </SaveButton>
        </>
      ) : (
        <MessageBox>No Authorized model detected, please refresh the addin</MessageBox>
      )}
    </Container>
  );
};

export default SaveScenarioActuals;
