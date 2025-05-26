import React, { useState, useEffect, useCallback } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { MdSaveAlt, MdOutlineSave } from "react-icons/md";
import { CiLock } from "react-icons/ci";
import { AiOutlineSetting } from "react-icons/ai";
import { IoMdSync } from "react-icons/io";
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
  Overlay,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ConfirmButton,
} from "./AGGForecastManagementPageStyles";

const AGGForecastManagementPage = ({ userName, setPageValue, onBack }) => {
  const [buttonSize, setButtonSize] = useState({ width: 90, height: 75, fontSize: "0.7rem", iconSize: 32 });
  const [modelIDValue, setModelIDValue] = useState("");
  const [showLoadConfirm, setShowLoadConfirm] = useState(false);

  // Responsive sizing
  const updateSize = useCallback(() => {
    const availableWidth = window.innerWidth - 130;
    const availableHeight = window.innerHeight - 180;
    const columns = Math.max(2, Math.floor(availableWidth / 110));
    const rows = Math.max(2, Math.floor(availableHeight / 110));
    const newSize = Math.min(availableWidth / columns, availableHeight / rows, 90);
    setButtonSize({ width: newSize, height: newSize * 0.8, fontSize: `${Math.max(0.7, newSize / 10)}rem`, iconSize: newSize * 0.4 });
  }, []);

  useEffect(() => {
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [updateSize]);

  // Fetch Model ID
  useEffect(() => {
    const checkModelType = async () => {
      try {
        if (typeof window.Excel === "undefined") return;
        await Excel.run(async (context) => {
          const sheets = context.workbook.worksheets;
          sheets.load("items/name");
          await context.sync();
          const mdSheet = sheets.items.find((s) => s.name.toLowerCase() === "cloud_backend_md");
          if (!mdSheet) return;
          const range = mdSheet.getRange("B7");
          range.load("values");
          await context.sync();
          setModelIDValue(range.values[0][0] || "");
        });
      } catch (error) {
        console.error(error);
      }
    };
    checkModelType();
  }, []);

  // Sync metadata
  const sync_MetaData_AGG = async () => {
    setPageValue("LoadingCircleComponent", "Syncing data...");
    try {
      const resp = await AWSconnections.FetchMetaData(
        "FETCH_METADATA",
        localStorage.getItem("idToken"),
        CONFIG.AWS_SECRETS_NAME,
        localStorage.getItem("User_ID"),
        localStorage.getItem("username")
      );
      await Excelconnections.setCalculationMode("manual");
      await Excelconnections.apiResponseToExcel(resp, "cloud_backend_ds", "A1");
      setPageValue("SaveForecastPageinterim", "Dropdowns synced with the latest scenario names from the data lake");
      Excelconnections.setCalculationMode("automatic");
    } catch (error) {
      console.error(error);
    }
  };

  // Load models logic
  const LoadAggModels = useCallback(async () => {
    setPageValue("LoadingCircleComponent", "0% | Loading Models...");
    const data = await Excelconnections.readNamedRangeToArray("Cloud_LoadModels_List");
    const sheetNames = data.map((row) => row[0]);
    const forecastIDs = data.map((row) => row[6]);
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
      sheetNames,
      forecastIDs,
      [],
      setPageValue
    );
    setPageValue("SaveForecastPageinterim", "Selected scenarios loaded successfully.");
    Excelconnections.setCalculationMode("automatic");
  }, [setPageValue]);

  // Modal handlers
  const handleLoadClick = () => setShowLoadConfirm(true);
  const handleLoadCancel = () => setShowLoadConfirm(false);
  const handleLoadConfirm = async () => {
    setShowLoadConfirm(false);
    await LoadAggModels();
  };

  // Other buttons array
  const buttons = [
    { name: "Sync Data", icon: <IoMdSync size={buttonSize.iconSize} />, action: sync_MetaData_AGG, disabled: false },
    { name: "Load Models", icon: <MdSaveAlt size={buttonSize.iconSize} />, action: handleLoadClick, disabled: false },
    { name: "Save", icon: <MdOutlineSave size={buttonSize.iconSize} />, action: () => setPageValue("AggSaveScenario"), disabled: false },
    { name: "Save & Lock", icon: <CiLock size={buttonSize.iconSize} />, action: () => setPageValue("AggLockScenario"), disabled: false },
    { name: "Save Actuals Only", icon: <MdOutlineSave size={buttonSize.iconSize} />, action: () => setPageValue("SaveScenarioActuals"), disabled: false },
    { name: "Load Aggregator", icon: <MdSaveAlt size={buttonSize.iconSize} />, action: () => setPageValue("SaveScenarioActuals"), disabled: true },
  ];

  return (
    <HomePageContainer>
      <ContentWrapper>
        <WelcomeContainer>
          <BackButtonIcon as={FaArrowLeft} size={24} onClick={onBack} />
          <h1>Forecast Management</h1>
        </WelcomeContainer>

        <ButtonsContainer>
          {buttons.map((button, idx) => (
            <Button key={idx} onClick={!button.disabled ? button.action : undefined} disabled={button.disabled}>
              <IconWrapper disabled={button.disabled} size={buttonSize.iconSize}>
                {button.icon}
              </IconWrapper>
              <p className="button-text">{button.name}</p>
              {button.disabled && <Tooltip className="tooltip">Feature not activated.</Tooltip>}
            </Button>
          ))}
        </ButtonsContainer>
      </ContentWrapper>

      {showLoadConfirm && (
        <Overlay>
          <Modal>
            <ModalHeader>Import Data?</ModalHeader>
            <ModalBody>Do you want to import data for selected indication and scenarios?</ModalBody>
            <ModalFooter>
              <ConfirmButton onClick={handleLoadConfirm}>Yes</ConfirmButton>
              <ConfirmButton onClick={handleLoadCancel}>No</ConfirmButton>
            </ModalFooter>
          </Modal>
        </Overlay>
      )}
    </HomePageContainer>
  );
};

export default AGGForecastManagementPage;
