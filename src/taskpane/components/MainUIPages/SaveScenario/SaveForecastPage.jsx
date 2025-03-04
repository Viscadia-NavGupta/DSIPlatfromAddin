import React, { useState, useEffect, useMemo } from "react";
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
const SaveScenario = ({ setPageValue }) => {
  const [selectedCycle, setSelectedCycle] = useState("");
  const [scenarioName, setScenarioName] = useState("");
  const [heading, setHeading] = useState("Active Sheet Name");
  const [isOutputSheet, setIsOutputSheet] = useState(false);
  const storedUsername = useMemo(() => sessionStorage.getItem("username"), []);
  const [cycleItems, setCycleItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modelIDValue, setModelIDValue] = useState(""); // ✅ Global state for ModelIDValue

  useEffect(() => {
    const initializePage = async () => {
      try {
        await checkofCloudBackendSheet();
        await fetchDataFromLambda();
      } catch (error) {
        console.error("🚨 Initialization failed:", error);
      } finally {
        setLoading(false);
      }
    };
    initializePage();
  }, []);

  const fetchDataFromLambda = async () => {
    try {
      console.log("📤 Fetching Data from Lambda...");
      const responseBody = await AWSconnections.FetchMetaData(
        "FETCH_METADATA",
        localStorage.getItem("idToken"),
        "dsivis-dev-remaining-secrets",
        localStorage.getItem("User_ID"),
        localStorage.getItem("username")
      );

      if (!responseBody || !responseBody.results2) {
        throw new Error("❌ No results2 found in Lambda response.");
      }

      const results = responseBody.results2;
      console.log("✅ Lambda Response:", results);

      const df = new DataFrame(results);
      const items = df
        .distinct("cycle_name")
        .toArray()
        .map((row) => row[0]);

      console.log("Cycle Items:", items);
      setCycleItems(items);
    } catch (error) {
      console.error("🚨 Error fetching data from Lambda:", error);
    }
  };

  const checkofCloudBackendSheet = async () => {
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
          var ModelName = sheet.getRange("B5");
          var ModelID = sheet.getRange("B7");
          ModelName.load("values");
          ModelID.load("values");
          await context.sync();

          let ModelNameValue = ModelName.values[0][0] || "";
          let ModelIDValue = ModelID.values[0][0] || "";

          setHeading(`Save Scenario for: ${ModelNameValue}`);
          setIsOutputSheet(true);
          setModelIDValue(ModelIDValue); // ✅ Update global state for ModelIDValue

          console.log("✅ Output Sheet Found:", ModelNameValue, ModelIDValue);
        } else {
          console.log("⚠️ No Output Sheet Found.");
          setIsOutputSheet(false);
        }
      });
    } catch (error) {
      console.error("🚨 Error checking for Outputs sheet:", error);
      setIsOutputSheet(false);
    }
  };

  const handleCycleChange = (e) => {
    setSelectedCycle(e.target.value);
  };

  const handleScenarioChange = (e) => {
    setScenarioName(e.target.value);
  };

  const handleSaveClick = async () => {
    setPageValue("LoadingCircleComponent", "Saving your forecast...");

    console.log("📤 Saving Forecast:", { cycle_name: selectedCycle, scenario_name: scenarioName });
    console.log("🔹 Using Model ID:", modelIDValue); // ✅ Now accessible

    await excelfucntions.setCalculationMode("manual");
    await excelfucntions.generateLongFormData("US");
    await excelfucntions.setCalculationMode("manual");
    await inputfiles.saveData();
    await excelfucntions.setCalculationMode("manual");
    let SaveFlag = await AWSconnections.service_orchestration(
      "SAVE_FORECAST",
      "",
      modelIDValue, // ✅ Now accessible everywhere
      scenarioName,
      selectedCycle,
      "",
      "",
      ""
    );
    // const successMessage = SaveFlag;
    // console.log(successMessage);
    // if (successMessage==="Saved Forecast"){
      setPageValue("SaveForecastPageinterim");
    // };

    // if (typeof setPageValue === "function") {
    //   setPageValue("SaveForecastPage");
    // } else {
    //   console.error("🚨 setPageValue is not a function!");
    // }
  };

  return (
    <Container>
      {loading ? (
        <MessageBox>Loading, please wait...</MessageBox>
      ) : isOutputSheet ? (
        <>
          <Heading>{heading}</Heading>
          <DropdownContainer>
            <SelectDropdown value={selectedCycle} onChange={handleCycleChange}>
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

            <Input type="text" placeholder="Enter Scenario Name" value={scenarioName} onChange={handleScenarioChange} />
          </DropdownContainer>
          <SaveButton onClick={handleSaveClick}>Save</SaveButton>
        </>
      ) : (
        <MessageBox>No Authorised model detected, please refresh the addin</MessageBox>
      )}
    </Container>
  );
};

export default SaveScenario;
