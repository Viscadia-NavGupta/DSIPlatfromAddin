// src/pages/AGGForecastManagementPage.jsx

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
  MessageBox,
} from "./AGGForecastManagementPageStyles";

const AGGForecastManagementPage = ({ userName, setPageValue, onBack }) => {
  const [buttonSize, setButtonSize] = useState({
    width: 90,
    height: 75,
    fontSize: "0.7rem",
    iconSize: 32,
  });
  const [modelIDValue, setModelIDValue] = useState("");
  const [modelTypeValue, setModelTypeValue] = useState("");
  const [showLoadConfirm, setShowLoadConfirm] = useState(false);

  // auth states
  const [authorized, setAuthorized] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState("");

  // Responsive sizing
  const updateSize = useCallback(() => {
    const aw = window.innerWidth - 130;
    const ah = window.innerHeight - 180;
    const cols = Math.max(2, Math.floor(aw / 110));
    const rows = Math.max(2, Math.floor(ah / 110));
    const sz = Math.min(aw / cols, ah / rows, 90);
    setButtonSize({
      width: sz,
      height: sz * 0.8,
      fontSize: `${Math.max(0.7, sz / 10)}rem`,
      iconSize: sz * 0.4,
    });
  }, []);

  useEffect(() => {
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [updateSize]);

  // 1️⃣ Read model info and authorize
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!window.Excel) return;
        await Excel.run(async (ctx) => {
          const sheets = ctx.workbook.worksheets;
          sheets.load("items/name");
          await ctx.sync();

          const md = sheets.items.find(
            (s) => s.name.toLowerCase() === "cloud_backend_md"
          );
          if (!md) {
            setAuthError("No authorized model found. Please refresh the add-in.");
            setAuthChecked(true);
            return;
          }

          const ranges = {
            ModelID: md.getRange("B7"),
            ModelType: md.getRange("B8"),
          };
          ranges.ModelID.load("values");
          ranges.ModelType.load("values");
          await ctx.sync();

          const id = ranges.ModelID.values[0][0]?.toString().trim() || "";
          const type = ranges.ModelType.values[0][0]?.toString().trim() || "";
          setModelIDValue(id);
          setModelTypeValue(type);

          if (type !== "AGGREGATOR") {
            setAuthError("No authorized model found. Please refresh the add-in.");
            setAuthChecked(true);
            return;
          }

          // Fetch the authorized list from Lambda
          const resp = await AWSconnections.FetchMetaData(
            "FETCH_METADATA",
            localStorage.getItem("idToken"),
            CONFIG.AWS_SECRETS_NAME,
            localStorage.getItem("User_ID"),
            localStorage.getItem("username")
          );
          const df = new DataFrame(resp.result3);
          const allowed = df
            .toCollection()
            .some(
              (r) =>
                r.model_id === id &&
                (r.model_type?.toString().trim() || "") === type
            );

          if (!allowed) {
            setAuthError("No authorized model found. Please refresh the add-in.");
          } else {
            setAuthorized(true);
          }
          setAuthChecked(true);
        });
      } catch (err) {
        console.error(err);
        setAuthError("No authorized model found. Please refresh the add-in.");
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  // 2️⃣ Sync metadata
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
      setPageValue(
        "SaveForecastPageinterim",
        "Dropdowns synced with the latest scenario names from the data lake"
      );
    } catch (error) {
      console.error(error);
      setPageValue("SaveForecastPageinterim", "Some error occurred, please try again");
    } finally {
      await Excelconnections.setCalculationMode("automatic");
    }
  };

  // 3️⃣ Load models logic
  const LoadAggModels = useCallback(
    async () => {
      setPageValue("LoadingCircleComponent", "0% | Loading Models...");
      try {
        const data = await Excelconnections.readNamedRangeToArray(
          "Cloud_LoadModels_List"
        );
        const sheetNames = data.map((r) => r[0]);
        const forecastIDs = data.map((r) => r[6]);
        await Excelconnections.setCalculationMode("manual");
        const saveFlag = await AWSconnections.service_orchestration(
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
        if (
          saveFlag.status === "SUCCESS" ||
          (saveFlag && saveFlag.result === "DONE")
        ) {
          setPageValue(
            "SaveForecastPageinterim",
            "Selected scenarios loaded successfully."
          );
        } else {
          setPageValue("SaveForecastPageinterim", "Some error occurred, please try again");
        }
      } catch (error) {
        console.error(error);
        setPageValue("SaveForecastPageinterim", "Some error occurred, please try again");
      } finally {
        await Excelconnections.setCalculationMode("automatic");
      }
    },
    [setPageValue]
  );

  // 4️⃣ Modal handlers
  const handleLoadClick = () => setShowLoadConfirm(true);
  const handleLoadCancel = () => setShowLoadConfirm(false);
  const handleLoadConfirm = async () => {
    setShowLoadConfirm(false);
    await LoadAggModels();
  };

  // 5️⃣ While authorization has not yet completed, show “Checking cloud compatibility…” exactly like in other pages
  if (!authChecked) {
    return <MessageBox>Checking cloud compatibility, please wait...</MessageBox>;
  }

  // 6️⃣ After auth check, if not authorized, show the error inside the same styled‐MessageBox
  if (!authorized) {
    return <MessageBox>{authError}</MessageBox>;
  }

  // 7️⃣ If authorized, show the normal header + button grid
  const buttons = [
    {
      name: "Sync Data",
      icon: <IoMdSync size={buttonSize.iconSize} />,
      action: sync_MetaData_AGG,
      disabled: false,
    },
    {
      name: "Load Models",
      icon: <MdSaveAlt size={buttonSize.iconSize} />,
      action: handleLoadClick,
      disabled: false,
    },
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
      name: "Save Actuals Only",
      icon: <MdOutlineSave size={buttonSize.iconSize} />,
      action: () => setPageValue("SaveScenarioActuals"),
      disabled: false,
    },
    {
      name: "Load Aggregator",
      icon: <AiOutlineSetting size={buttonSize.iconSize} />,
      action: () => setPageValue("LoadScenarioAgg"),
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
          {buttons.map((button, idx) => (
            <Button
              key={idx}
              onClick={!button.disabled ? button.action : undefined}
              disabled={button.disabled}
            >
              <IconWrapper disabled={button.disabled} size={buttonSize.iconSize}>
                {button.icon}
              </IconWrapper>
              <p className="button-text">{button.name}</p>
              {button.disabled && (
                <Tooltip className="tooltip">Feature not activated.</Tooltip>
              )}
            </Button>
          ))}
        </ButtonsContainer>
      </ContentWrapper>

      {showLoadConfirm && (
        <Overlay>
          <Modal>
            <ModalHeader>Import Data?</ModalHeader>
            <ModalBody>
              Do you want to import data for selected indication and scenarios?
            </ModalBody>
            <ModalFooter>
              <ConfirmButton onClick={handleLoadConfirm}>Yes</ConfirmButton>
              {/* “No” button with grey background: */}
              <ConfirmButton
                style={{ backgroundColor: "#63666A" }}
                onClick={handleLoadCancel}
              >
                No
              </ConfirmButton>
            </ModalFooter>
          </Modal>
        </Overlay>
      )}
    </HomePageContainer>
  );
};

export default AGGForecastManagementPage;
