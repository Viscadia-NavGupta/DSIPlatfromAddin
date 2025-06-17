// src/pages/ForecastLibrarypage.jsx

import React, { useState, useEffect } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { MdSaveAlt } from "react-icons/md";
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
  MessageBox, // ← import the same styled‐MessageBox used in ForecastManagementPage
} from "./ForecastLibrarypageStyles";

const ForecastLibrarypage = ({ userName, setPageValue, onBack }) => {
  const [buttonSize, setButtonSize] = useState({
    width: 90,
    height: 75,
    fontSize: "0.7rem",
    iconSize: 32,
  });
  const [loading, setLoading] = useState(true);
  const [modelIDValue, setModelIDValue] = useState("");
  const [modelType, setModelType] = useState("");
  const [modelIDError, setModelIDError] = useState("");
  const [isOutputSheet, setIsOutputSheet] = useState(false);
  const [dataFrames, setDataFrames] = useState({ dfResult3: null });

  // Modal for “Load Data” confirmation
  const [showConfirmLoad, setShowConfirmLoad] = useState(false);

  // Responsive sizing logic
  const updateSize = () => {
    const availableWidth = window.innerWidth - 130;
    const availableHeight = window.innerHeight - 180;
    const columns = Math.max(2, Math.floor(availableWidth / 110));
    const rows = Math.max(2, Math.floor(availableHeight / 110));
    const newSize = Math.min(
      availableWidth / columns,
      availableHeight / rows,
      90
    );
    const fontSize = `${Math.max(0.7, newSize / 10)}rem`;
    const iconSize = newSize * 0.4;
    setButtonSize({
      width: newSize,
      height: newSize * 0.8,
      fontSize,
      iconSize,
    });
  };

  useEffect(() => {
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // 1️⃣ Check cloud backend metadata sheet
  const checkModelAuthorization = async () => {
    try {
      if (typeof window.Excel === "undefined") return;
      await Excel.run(async (ctx) => {
        const sheets = ctx.workbook.worksheets;
        sheets.load("items/name");
        await ctx.sync();

        const md = sheets.items.find(
          (s) => s.name.toLowerCase() === "cloud_backend_md"
        );
        if (!md) {
          setIsOutputSheet(false);
          return;
        }

        const ranges = {
          ModelID: md.getRange("B7"),
          ModelType: md.getRange("B8"),
        };
        Object.values(ranges).forEach((r) => r.load("values"));
        await ctx.sync();

        const id = ranges.ModelID.values[0][0]?.toString().trim() || "";
        const type = ranges.ModelType.values[0][0]?.toString().trim() || "";
        setModelIDValue(id);
        setModelType(type);
        setIsOutputSheet(!!(id && type));
      });
    } catch (err) {
      console.error("Model Auth Error:", err);
      setIsOutputSheet(false);
    }
  };

  // 2️⃣ Fetch authorization data from your Lambda
  const fetchAuthorizationData = async () => {
    try {
      const resp = await AWSconnections.FetchMetaData(
        "FETCH_METADATA",
        localStorage.getItem("idToken"),
        CONFIG.AWS_SECRETS_NAME,
        localStorage.getItem("User_ID"),
        localStorage.getItem("username")
      );
      setDataFrames({ dfResult3: new DataFrame(resp.result3) });
    } catch (err) {
      console.error("Authorization Data Fetch Error:", err);
    }
  };

  // 3️⃣ On mount, run both checks, then clear loading
  useEffect(() => {
    (async () => {
      await Promise.all([checkModelAuthorization(), fetchAuthorizationData()]);
      setLoading(false);
    })();
  }, []);

  // 4️⃣ Final authorization check once loading is done
  useEffect(() => {
    if (!loading && modelIDValue && modelType && dataFrames.dfResult3) {
      const allowed = dataFrames.dfResult3
        .toCollection()
        .some(
          (m) =>
            m.model_id === modelIDValue &&
            (m.model_type?.toString().trim() || "") === modelType
        );
      if (!allowed) {
        setModelIDError("No Authorized Forecast Library Found");
        setIsOutputSheet(false);
      } else {
        setModelIDError("");
      }
    }
  }, [loading, modelIDValue, modelType, dataFrames.dfResult3]);

  // 5️⃣ Core “Load Data” function with progress updates
  const LoadAggModels = async () => {
    const access = await AWSconnections.ButtonAccess("EXTRACT_DASHBOARD_DATA");
    if (access?.message === "ACCESS DENIED") {
      setPageValue(
        "SaveForecastPageinterim",
        "You do not have permission to use Forecast Library."
      );
      return;
    }

    let progress = 0;
    setPageValue("LoadingCircleComponent", `${progress}% | Loading Data...`);
    const intervalId = setInterval(() => {
      progress = Math.min(progress + 3, 95);
      setPageValue("LoadingCircleComponent", `${progress}% | Loading Data...`);
    }, 2000);

    try {
      let ForecastIDS = await Excelconnections.calculateAndFetchColumnAN("Setup");
      ForecastIDS = ForecastIDS.map((item) => item.replace(/^forecast_/, ""));
      await Excelconnections.setCalculationMode("manual");
      const result = await AWSconnections.service_orchestration(
        "EXTRACT_DASHBOARD_DATA",
        "",
        "",
        "",
        "",
        "",
        CONFIG.AWS_SECRETS_NAME,
        "",
        "",
        [],
        [],
        [],
        [],
        setPageValue,
        ForecastIDS
      );

      clearInterval(intervalId);
      setPageValue("LoadingCircleComponent", `100% | Loading Data...`);
      await new Promise((r) => setTimeout(r, 300));

      if (result?.status === "SUCCESS") {
        setPageValue(
          "SaveForecastPageinterim",
          "Data loaded successfully. Please press the 'Refresh Slicers' button to reflect latest changes"
        );
      } else {
        const errMsg =
          result?.message || "Some error occurred during load, please try again";
        setPageValue("SaveForecastPageinterim", errMsg);
      }
    } catch (err) {
      clearInterval(intervalId);
      console.error("LoadAggModels error:", err);
      setPageValue(
        "SaveForecastPageinterim",
        "Some error occurred during load, please try again"
      );
    }
  };

  // 6️⃣ Modal handlers
  const handleLoadClick = () => setShowConfirmLoad(true);
  const handleConfirmLoad = async () => {
    setShowConfirmLoad(false);
    await LoadAggModels();
  };
  const handleCancelLoad = () => setShowConfirmLoad(false);

  const buttons = [
    {
      name: "Sync Data",
      icon: <IoMdSync size={buttonSize.iconSize} />,
      action: () => setPageValue("FLSyncData"),
      disabled: false,
    },
    {
      name: "Load Data",
      icon: <MdSaveAlt size={buttonSize.iconSize} />,
      action: handleLoadClick,
      disabled: false,
    },
  ];

  // ─── 8️⃣ If still loading, return ONLY the MessageBox (no header at all) ───
  if (loading) {
    return <MessageBox>Connecting to data lake, please wait…</MessageBox>;
  }

  // ─── 9️⃣ Once loading is false, render header + conditional body ──────────
  return (
    <HomePageContainer>
      <ContentWrapper>
        {/** Always show the header with back arrow + title */}
        <WelcomeContainer>
          <BackButtonIcon
            as={FaArrowLeft}
            size={24}
            onClick={() => setPageValue("Home")}
          />
          <h1>Forecast Library</h1>
        </WelcomeContainer>

        {/** Now that loading is false, pick one of these four states: */}
        {modelIDError ? (
          // 1) authorization‐failure message
          <p style={{ color: "#B4322A" }}>{modelIDError}</p>
        ) : !isOutputSheet ? (
          // 2) missing sheet or id/type pair
          <p style={{ color: "#B4322A" }}>
            Current workbook is not a compatible version of Forecast Library. Please open the latest Forecast Library version to use this feature
          </p>
        ) : modelType !== "FORECAST_LIBRARY" ? (
          // 3) wrong ModelType
          <p style={{ color: "#B4322A" }}>
            Current workbook is not a compatible version of Forecast Library. Please open the latest Forecast Library version to use this feature
          </p>
        ) : (
          // 4) everything ok → show button grid
          <ButtonsContainer>
            {buttons.map((btn, idx) => (
              <Button
                key={idx}
                onClick={!btn.disabled ? btn.action : undefined}
                disabled={btn.disabled}
                style={{
                  width: buttonSize.width,
                  height: buttonSize.height,
                }}
              >
                <IconWrapper size={buttonSize.iconSize}>{btn.icon}</IconWrapper>
                <p>{btn.name}</p>
                {btn.disabled && <Tooltip>Feature not activated.</Tooltip>}
              </Button>
            ))}
          </ButtonsContainer>
        )}
      </ContentWrapper>

      {showConfirmLoad && (
        <Overlay>
          <Modal>
            <ModalHeader style={{ color: "#B4322A" }}>
              Confirm Data Load
            </ModalHeader>
            <ModalBody>
              This will fetch and write all dashboard data. Proceed?
            </ModalBody>
            <ModalFooter>
              <ConfirmButton onClick={handleConfirmLoad}>Yes</ConfirmButton>
              <ConfirmButton
                style={{ backgroundColor: "#63666A" }}
                onClick={handleCancelLoad}
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

export default ForecastLibrarypage;
