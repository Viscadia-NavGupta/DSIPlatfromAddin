import React, { useState, useEffect } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { MdSaveAlt, MdOutlineSave } from "react-icons/md";
import { CiLock } from "react-icons/ci";
import { AiOutlineSetting } from "react-icons/ai";
import { IoMdSync } from "react-icons/io";
import { DataFrame } from "dataframe-js"; // Ensure DataFrame is imported
import * as Excelconnections from "../../Middleware/ExcelConnection";
import * as AWSconnections from "../../Middleware/AWSConnections";
import {
  HomePageContainer,
  ContentWrapper,
  WelcomeContainer,
  ButtonsContainer,
  Button,
  Tooltip,
  BackButtonIcon,
  IconWrapper,
} from "./AGGForecastManagementPageStyles";

const AGGForecastManagementPage = ({ userName, setPageValue, onBack }) => {
  const [buttonSize, setButtonSize] = useState({ width: 90, height: 75, fontSize: "0.7rem", iconSize: 32 });
  const [loading, setLoading] = useState(true); // Initially loading is true
  const [modelIDValue, setModelIDValue] = useState(""); // Store Model ID

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
    const checkModelType = async () => {
      try {
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
              ModelID: sheet.getRange("B7"), // The cell where ModelID is located
            };

            ranges.ModelID.load("values");
            await context.sync();

            const ModelIDValue = ranges.ModelID.values[0][0] || "";
            setModelIDValue(ModelIDValue);

            console.log("✅ Model ID fetched:", ModelIDValue);
          } else {
            console.log("⚠️ No Output Sheet Found.");
          }
        });
      } catch (error) {
        console.error("🚨 Error checking ModelType:", error);
      }
    };

    checkModelType();
  }, []);

  // Only handle "update actuals" button
  const sync_MetaData_AGG = async () => {
    console.log("Update Actuals button clicked");
    setPageValue("LoadingCircleComponent", "Syncing data...");

    // Set page value with a message

    try {
      // Fetch metadata
      const responseBody = await AWSconnections.FetchMetaData(
        "FETCH_METADATA",
        localStorage.getItem("idToken"),
        "DSI-prod-remaining-secrets",
        localStorage.getItem("User_ID"),
        localStorage.getItem("username")
      );

      // Use the API response and send it to Excel
      await Excelconnections.apiResponseToExcel(responseBody, "cloud_backend_ds", "A1");
      console.log("Metadata synced to Excel");
      setPageValue("SaveForecastPageinterim", "Dropdowns synced with the latest scenario names from the data lake");
    } catch (error) {
      console.error("Error fetching metadata or syncing to Excel:", error);
    }
  };

  const LoadAggModels = async () => {
    setPageValue("LoadingCircleComponent", "0% | Loading Models...");
    const Aggmodeldata = await Excelconnections.readNamedRangeToArray("Cloud_LoadModels_List");
    const Sheetnames = Aggmodeldata.map((row) => row[0]);
    const forecastIDs = Aggmodeldata.map((row) => row[6]);
    await Excelconnections.setCalculationMode("manual");
    const saveFlag = await AWSconnections.service_orchestration(
      "Agg_Load_Models",
      "",
      "",
      "",
      "", // Fixed cycle value
      "",
      "",
      "",
      "",
      "",
      Sheetnames,
      forecastIDs,
      [],
      setPageValue
    );
    setPageValue("SaveForecastPageinterim", "Selected scenarios loaded successfully.");
    console.log(Aggmodeldata);
    console.log(Sheetnames);
    console.log(forecastIDs);
  };

  const buttons = [
    { name: "Sync Data", icon: <IoMdSync size={buttonSize.iconSize} />, action: sync_MetaData_AGG, disabled: false },
    { name: "Load Models", icon: <MdSaveAlt size={buttonSize.iconSize} />, action: LoadAggModels, disabled: false },
    {
      name: "Save",
      icon: <MdOutlineSave size={buttonSize.iconSize} />,
      action: () => setPageValue("AggSaveScenario"),
      disabled: false,
    },
    {
      name: "Save & Lock",
      icon: <CiLock size={buttonSize.iconSize} />,
      action: () => setPageValue("AggLockScenario"),
      disabled: false,
    },
    {
      name: "Save Actuals only",
      icon: <MdOutlineSave size={buttonSize.iconSize} />,
      action: () => setPageValue("SaveScenarioActuals"),
      disabled: false,
    },
    {
      name: "Load Aggregator ",
      icon: <MdSaveAlt size={buttonSize.iconSize} />,
      action: () => setPageValue("SaveScenarioActuals"),
      disabled: false,
    },
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
              <IconWrapper disabled={button.disabled} size={buttonSize.iconSize}>
                {button.icon}
              </IconWrapper>
              <p className="button-text">{button.name}</p>
              {button.disabled && <Tooltip className="tooltip">Feature not activated.</Tooltip>}
            </Button>
          ))}
        </ButtonsContainer>
      </ContentWrapper>
    </HomePageContainer>
  );
};

export default AGGForecastManagementPage;
