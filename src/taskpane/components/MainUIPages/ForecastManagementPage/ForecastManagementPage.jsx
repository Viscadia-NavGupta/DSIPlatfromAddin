import React, { useState, useEffect, useCallback } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { MdSaveAlt, MdOutlineSave } from "react-icons/md";
import { CiLock } from "react-icons/ci";
import { AiOutlineSetting } from "react-icons/ai";
import { DataFrame } from "dataframe-js"; // Ensure DataFrame is imported

import {
  HomePageContainer,
  ContentWrapper,
  WelcomeContainer,
  ButtonsContainer,
  Button,
  Tooltip,
  BackButtonIcon,
  IconWrapper,
} from "./ForecastManagementPageStyles";

const ForecastManagementPage = ({ userName, setPageValue, onBack }) => {
  const [buttonSize, setButtonSize] = useState({ width: 90, height: 75, fontSize: "0.7rem", iconSize: 32 });
  const [modelType, setModelType] = useState(""); // To store the modelType
  const [loading, setLoading] = useState(true); // Loading state
  const [modelIDValue, setModelIDValue] = useState(""); // Store the Model ID
  const [dataFrames, setDataFrames] = useState({
    dfResult1: null,
    dfResult2: null,
    dfResult3: null,
  }); // Store DataFrames for Lambda results

  // Function to check the model type and activate AGGForecastManagementPage if necessary
  const checkModelType = useCallback(async () => {
    try {
      console.log("📊 Checking ModelType...");
      if (typeof window.Excel === "undefined") {
        console.error("🚨 Excel API is not available.");
        return;
      }

      await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        sheets.load("items/name");
        await context.sync();

        const MetaDataSheet = sheets.items.find(
          (sheet) => sheet.name.toLowerCase() === "cloud_backend_md"
        );

        if (MetaDataSheet) {
          const sheet = MetaDataSheet;
          const ranges = {
            ModelType: sheet.getRange("B8"), // The cell where ModelType is located
            ModelID: sheet.getRange("B7"), // The cell where ModelID is located
          };

          ranges.ModelType.load("values");
          ranges.ModelID.load("values");
          await context.sync();

          const ModelTypeValue = ranges.ModelType.values[0][0] || "";
          const ModelIDValue = ranges.ModelID.values[0][0] || "";

          // Set the modelType and modelIDValue states
          setModelType(ModelTypeValue);
          setModelIDValue(ModelIDValue);

          // If ModelType is AGGREGATOR, set page value to AGGForecastManagementPage
          if (ModelTypeValue === "AGGREGATOR") {
            setPageValue("AGGForecastManagementPage", "Loading Aggregator Forecast Management...");
          }
        } else {
          console.log("⚠️ No Output Sheet Found.");
        }
      });
    } catch (error) {
      console.error("🚨 Error checking ModelType:", error);
    }
  }, [setPageValue]);

  // Resize buttons based on screen size
  const updateSize = () => {
    const availableWidth = window.innerWidth - 130; // Adjust for sidebar
    const availableHeight = window.innerHeight - 180; // Adjust for header/footer

    const columns = Math.max(2, Math.floor(availableWidth / 110)); // Ensure at least 2 buttons per row
    const rows = Math.max(2, Math.floor(availableHeight / 110)); // Ensure at least 2 rows

    const newSize = Math.min(availableWidth / columns, availableHeight / rows, 90); // Smaller buttons
    const fontSize = `${Math.max(0.7, newSize / 10)}rem`; // Smaller text
    const iconSize = newSize * 0.4; // Smaller icons

    setButtonSize({ width: newSize, height: newSize * 0.8, fontSize, iconSize });
  };

  useEffect(() => {
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    // Check the ModelType when the page is loaded
    checkModelType();
  }, [checkModelType]);

  const buttons = [
    { name: "Load", icon: <MdSaveAlt size={buttonSize.iconSize} />, action: () => setPageValue("LoadScenario"), disabled: false },
    { name: "Save", icon: <MdOutlineSave size={buttonSize.iconSize} />, action: () => setPageValue("SaveForecastPage"), disabled: false },
    { name: "Save & Lock", icon: <CiLock size={buttonSize.iconSize} />, action: () => setPageValue("SaveandLockScenario"), disabled: true },
  ];

  return (
    <HomePageContainer>
      <ContentWrapper>
        <WelcomeContainer>
          <BackButtonIcon as={FaArrowLeft} size={24} onClick={onBack} />
          <h1>Forecast Management</h1>
        </WelcomeContainer>

        <ButtonsContainer>
          {buttons.map((button, index) => (
            <Button key={index} onClick={!button.disabled ? button.action : undefined} disabled={button.disabled}>
              <IconWrapper disabled={button.disabled} size={buttonSize.iconSize}>{button.icon}</IconWrapper>
              <p className="button-text">{button.name}</p>
              {button.disabled && <Tooltip className="tooltip">Feature not activated.</Tooltip>}
            </Button>
          ))}
        </ButtonsContainer>
      </ContentWrapper>
    </HomePageContainer>
  );
};

export default ForecastManagementPage;
