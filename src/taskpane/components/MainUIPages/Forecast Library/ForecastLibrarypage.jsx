import React, { useState, useEffect } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { MdSaveAlt, MdOutlineSave } from "react-icons/md";
import { CiLock } from "react-icons/ci";
import { IoMdSync } from "react-icons/io";
import { BsFileEarmarkBarGraph } from "react-icons/bs";
import { DataFrame } from "dataframe-js";
import * as Excelconnections from "../../Middleware/ExcelConnection";
import * as AWSconnections from "../../Middleware/AWSConnections";
import CONFIG from "../../Middleware/AWSConnections";
import {
  HomePageContainer,
  ContentWrapper,
  WelcomeContainer,
  ButtonsContainer,
  Button,
  Tooltip,
  BackButtonIcon,
  IconWrapper,
} from "./ForecastLibrarypageStyles";

const ForecastLibrarypage = ({ userName, setPageValue, onBack }) => {
  const [buttonSize, setButtonSize] = useState({ width: 90, height: 75, fontSize: "0.7rem", iconSize: 32 });
  const [loading, setLoading] = useState(true);
  const [modelIDValue, setModelIDValue] = useState("");
  const [modelType, setModelType] = useState("");
  const [modelIDError, setModelIDError] = useState("");
  const [isOutputSheet, setIsOutputSheet] = useState(false);
  const [dataFrames, setDataFrames] = useState({
    dfResult3: null,
  });

  const updateSize = () => {
    const availableWidth = window.innerWidth - 130;
    const availableHeight = window.innerHeight - 180;
    const columns = Math.max(2, Math.floor(availableWidth / 110));
    const rows = Math.max(2, Math.floor(availableHeight / 110));
    const newSize = Math.min(availableWidth / columns, availableHeight / rows, 90);
    const fontSize = `${Math.max(0.7, newSize / 10)}rem`;
    const iconSize = newSize * 0.4;
    setButtonSize({ width: newSize, height: newSize * 0.8, fontSize, iconSize });
  };

  useEffect(() => {
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const checkModelAuthorization = async () => {
    try {
      if (typeof window.Excel === "undefined") return;

      await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        sheets.load("items/name");
        await context.sync();

        const MetaDataSheet = sheets.items.find((sheet) => sheet.name.toLowerCase() === "cloud_backend_md");
        if (MetaDataSheet) {
          const ranges = {
            ModelName: MetaDataSheet.getRange("B5"),
            ModelID: MetaDataSheet.getRange("B7"),
            ModelType: MetaDataSheet.getRange("B8"),
          };

          Object.values(ranges).forEach((r) => r.load("values"));
          await context.sync();

          const modelID = ranges.ModelID.values[0][0]?.toString().trim() || "";
          const modelType = ranges.ModelType.values[0][0]?.toString().trim() || "";

          setModelIDValue(modelID);
          setModelType(modelType);

          if (!modelID || !modelType) {
            setIsOutputSheet(false);
            return;
          }

          setIsOutputSheet(true);
        } else {
          setIsOutputSheet(false);
        }
      });
    } catch (error) {
      console.error("Model Auth Error:", error);
      setIsOutputSheet(false);
    }
  };

  const fetchAuthorizationData = async () => {
    try {
      const responseBody = await AWSconnections.FetchMetaData(
        "FETCH_METADATA",
        localStorage.getItem("idToken"),
        CONFIG.AWS_SECRETS_NAME,
        localStorage.getItem("User_ID"),
        localStorage.getItem("username")
      );
      const df3 = new DataFrame(responseBody.result3);
      setDataFrames({ dfResult3: df3 });
    } catch (error) {
      console.error("Authorization Data Fetch Error:", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([checkModelAuthorization(), fetchAuthorizationData()]);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!loading && modelIDValue && dataFrames.dfResult3) {
      const models = dataFrames.dfResult3.toCollection();
      const authorized = models.some((model) => model.model_id === modelIDValue);
      if (!authorized) {
        setModelIDError("This model is not authorized.");
        setIsOutputSheet(false);
      } else {
        setModelIDError("");
      }
    }
  }, [loading, modelIDValue, dataFrames.dfResult3]);

  const sync_MetaData_AGG = async () => {
    setPageValue("LoadingCircleComponent", "Syncing data...");
    try {
      const responseBody = await AWSconnections.FetchMetaData(
        "FETCH_METADATA",
        localStorage.getItem("idToken"),
        CONFIG.AWS_SECRETS_NAME,
        localStorage.getItem("User_ID"),
        localStorage.getItem("username")
      );
      await Excelconnections.setCalculationMode("manual");
      await Excelconnections.apiResponseToExcel(responseBody, "cloud_backend_ds", "A1");
      await Excelconnections.setCalculationMode("automatic");
      setPageValue("SaveForecastPageinterim", "Dropdowns synced successfully.");
    } catch (error) {
      console.error("Sync MetaData Error:", error);
    }
  };

  const LoadAggModels = async () => {
    setPageValue("LoadingCircleComponent", "0% | Loading Models...");
    const Aggmodeldata = await Excelconnections.readNamedRangeToArray("Cloud_LoadModels_List");
    const Sheetnames = Aggmodeldata.map((row) => row[0]);
    const forecastIDs = Aggmodeldata.map((row) => row[6]);
    await Excelconnections.setCalculationMode("manual");
    await AWSconnections.service_orchestration(
      "Agg_Load_Models",
      "",
      "",
      "",
      "",
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
    await Excelconnections.setCalculationMode("automatic");
    setPageValue("SaveForecastPageinterim", "Scenarios loaded.");
  };

  const buttons = [
    { name: "Sync Data", icon: <IoMdSync size={buttonSize.iconSize} />, action: () => setPageValue("FLSyncData"), disabled: false },
    { name: "Load Data", icon: <MdSaveAlt size={buttonSize.iconSize} />, action: LoadAggModels, disabled: false },
  ];

  // const reportButtons = [
  //   { name: "Report 1", icon: <BsFileEarmarkBarGraph size={buttonSize.iconSize} />, action: () => {}, disabled: false },
  //   { name: "Report 2", icon: <BsFileEarmarkBarGraph size={buttonSize.iconSize} />, action: () => {}, disabled: false },
  //   { name: "Report 3", icon: <BsFileEarmarkBarGraph size={buttonSize.iconSize} />, action: () => {}, disabled: false },
  //   { name: "Report 4", icon: <BsFileEarmarkBarGraph size={buttonSize.iconSize} />, action: () => {}, disabled: false },
  // ];

  return (
    <HomePageContainer>
      <ContentWrapper>
        <WelcomeContainer>
          <BackButtonIcon as={FaArrowLeft} size={24} onClick={onBack} />
          <h1>Forecast Library</h1>
        </WelcomeContainer>

        {loading ? (
          <p>Loading...</p>
        ) : modelIDError ? (
          <p style={{ color: "red" }}>{modelIDError}</p>
        ) : !isOutputSheet ? (
          <p>No output sheet found or model not authorized.</p>
        ) : (
          <>
            {/* Top Action Buttons */}
            <ButtonsContainer style={{ gridTemplateColumns: "repeat(2, 1fr)", marginBottom: "12px" }}>
              {buttons.map((button, index) => (
                <Button
                  key={index}
                  onClick={!button.disabled ? button.action : undefined}
                  disabled={button.disabled}
                >
                  <IconWrapper disabled={button.disabled} size={buttonSize.iconSize}>
                    {button.icon}
                  </IconWrapper>
                  <p>{button.name}</p>
                  {button.disabled && <Tooltip className="tooltip">Feature not activated.</Tooltip>}
                </Button>
              ))}
            </ButtonsContainer>

            {/* Divider Line */}
            {/* <div style={{ borderBottom: "2px solid #B4322A", width: "90%", marginBottom: "12px" }} /> */}

            {/* Custom Reports Header */}
            {/* <div style={{ textAlign: "center", color: "#B4322A", fontWeight: "bold", fontSize: "1rem", marginBottom: "10px" }}>
              Custom Reports
            </div> */}

            {/* Custom Report Buttons */}
            {/* <ButtonsContainer> */}
              {/* {reportButtons.map((button, index) => (
                <Button
                  key={index}
                  onClick={!button.disabled ? button.action : undefined}
                  disabled={button.disabled}
                >
                  <IconWrapper disabled={button.disabled} size={buttonSize.iconSize}>
                    {button.icon}
                  </IconWrapper>
                  <p>{button.name}</p>
                  {button.disabled && <Tooltip className="tooltip">Feature not activated.</Tooltip>}
                </Button>
              ))} */}
            {/* </ButtonsContainer> */}
          </>
        )}
      </ContentWrapper>
    </HomePageContainer>
  );
};

export default ForecastLibrarypage;
