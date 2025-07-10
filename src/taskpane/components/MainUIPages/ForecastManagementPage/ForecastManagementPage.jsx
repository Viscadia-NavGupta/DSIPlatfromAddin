// src/pages/ForecastManagementPage.jsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { MdSaveAlt, MdOutlineSave, MdOutlineCalculate } from "react-icons/md";
import { CiLock } from "react-icons/ci";
import { RiFlowChart } from "react-icons/ri";
import { DataFrame } from "dataframe-js";

import { specialModelIds } from "../../Middleware/Model Config";
import * as AWSConnections from "../../Middleware/AWSConnections";

import {
  HomePageContainer,
  ContentWrapper,
  WelcomeContainer,
  ButtonsContainer,
  Button,
  Tooltip,
  BackButtonIcon,
  IconWrapper,
  MessageBox,
} from "./ForecastManagementPageStyles";

const ForecastManagementPage = ({ userName, setPageValue, onBack }) => {
  // ─── 1️⃣ Local state ───────────────────────────────────────────────────────────
  const [buttonSize, setButtonSize] = useState({
    width: 90,
    height: 75,
    fontSize: "0.7rem",
    iconSize: 32,
  });
  const [modelType, setModelType] = useState("");
  const [modelIDValue, setModelIDValue] = useState("");
  const [loading, setLoading] = useState(true);

  // ─── 2️⃣ Build DataFrame of allowed IDs ────────────────────────────────────────
  const allowedDF = useMemo(
    () =>
      new DataFrame(
        specialModelIds.map((id) => ({
          model_id: id.toString().trim().toLowerCase(),
        }))
      ),
    []
  );

  // ─── 3️⃣ Excel check callback ─────────────────────────────────────────────────
  const checkModelType = useCallback(async () => {
    try {
      if (typeof window.Excel === "undefined") return;

      await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        sheets.load("items/name");
        await context.sync();

        const mdSheet = sheets.items.find(
          (s) => s.name.toLowerCase() === "cloud_backend_md"
        );
        if (!mdSheet) return;

        const ranges = {
          ModelType: mdSheet.getRange("B8"),
          ModelID: mdSheet.getRange("B7"),
        };
        ranges.ModelType.load("values");
        ranges.ModelID.load("values");
        await context.sync();

        const mt = (ranges.ModelType.values[0][0] || "").toString().trim();
        const id = (ranges.ModelID.values[0][0] || "").toString().trim();

        setModelType(mt);
        setModelIDValue(id);

        // If aggregator, jump to AGG page
        if (mt === "AGGREGATOR") {
          setPageValue(
            "AGGForecastManagementPage",
            "Loading Aggregator Forecast Management..."
          );
        }
      });
    } catch (e) {
      console.error("Error checking ModelType:", e);
    }
  }, [setPageValue]);

  // ─── 4️⃣ Run the Excel check on mount ─────────────────────────────────────────
  useEffect(() => {
    checkModelType().finally(() => setLoading(false));
  }, [checkModelType]);

  // ─── 5️⃣ Compute whether Save & Lock should be enabled ────────────────────────
  const saveLockEnabled = useMemo(() => {
    if (modelType === "AGGREGATOR") return false;
    const normId = modelIDValue.toString().trim().toLowerCase();
    const allowedIds = allowedDF.toCollection().map((r) => r.model_id);
    return allowedIds.includes(normId);
  }, [modelType, modelIDValue, allowedDF]);

  // ─── NEW: Compute handler ────────────────────────────────────────────────────
  const handleCompute = async () => {
    try {
      setPageValue("LoadingCircleComponent", "Calculating Results...");
      await ExcelFunctions.setCalculationMode("manual");
      const result = await AWSConnections.service_orchestration("RUN_COMPUTATION");
      console.log("Computation result:", result);
      await ExcelFunctions.setCalculationMode("automatic");
      setPageValue("SuccessMessagePage", "Forecast Data Updated Successfully");
      // you can add further success UI/notifications here
    } catch (err) {
      console.error("Error during computation:", err);
      // you can show a MessageBox or toast here
    }
  };

  // ─── NEW: Calculations handler ───────────────────────────────────────────────
  const handleCalculations = async () => {
    setPageValue("LoadingCircleComponent", "Generating Calculations...");
    // wait 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // then unhide
    AWSConnections.unhideSheets([
      "Calculation Tabs>>",
      "Calculations | 1L",
      "Calculations | 2L",
      "Calculations | 3L",
      "Calculations | 4L+",
      "Event Modeling",
    ]);
    setPageValue("SuccessMessagePage", "Calculations generated successfully");
  };

  // ─── 6️⃣ Button definitions ─────────────────────────────────────────────────
  const buttons = useMemo(
    () => [
      {
        name: "Load",
        icon: <MdSaveAlt size={buttonSize.iconSize} />,
        action: () => setPageValue("LoadScenario"),
        disabled: false,
      },
      {
        name: "Compute",
        icon: <RiFlowChart size={buttonSize.iconSize} />,
        action: handleCompute,
        disabled: !saveLockEnabled,
      },
      {
        name: "Calculations",
        icon: <MdOutlineCalculate size={buttonSize.iconSize} />,
        action: handleCalculations,
        disabled: !saveLockEnabled,
      },
      {
        name: "Save",
        icon: <MdOutlineSave size={buttonSize.iconSize} />,
        action: () => setPageValue("SaveForecastPage"),
        disabled: false,
      },
      {
        name: "Save & Lock",
        icon: <CiLock size={buttonSize.iconSize} />,
        action: () => setPageValue("SaveandLockScenario"),
        disabled: !saveLockEnabled,
      },
    ],
    [buttonSize.iconSize, saveLockEnabled, setPageValue, handleCompute]
  );

  // ─── 7️⃣ Responsive sizing logic ─────────────────────────────────────────────
  useEffect(() => {
    const updateSize = () => {
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
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // ─── 8️⃣ Conditional rendering ────────────────────────────────────────────────
  if (loading) {
    return <MessageBox>Connecting to data lake, please wait…</MessageBox>;
  }

  if (modelType !== "FORECAST") {
    return (
      <HomePageContainer>
        <ContentWrapper>
          <WelcomeContainer>
            <BackButtonIcon as={FaArrowLeft} size={24} onClick={onBack} />
            <h1>Forecast Management</h1>
          </WelcomeContainer>
          <p style={{ color: "#B4322A" }}>
            Current workbook is not a compatible forecast model. Please open the
            latest ADC models to use this feature.
          </p>
        </ContentWrapper>
      </HomePageContainer>
    );
  }

  // ─── 9️⃣ Main UI ──────────────────────────────────────────────────────────────
  return (
    <HomePageContainer>
      <ContentWrapper>
        <WelcomeContainer>
          <BackButtonIcon as={FaArrowLeft} size={24} onClick={onBack} />
          <h1>Forecast Management</h1>
        </WelcomeContainer>

        <ButtonsContainer>
          {buttons.map((btn, i) => (
            <Button
              key={i}
              onClick={!btn.disabled ? btn.action : undefined}
              disabled={btn.disabled}
              style={{ width: buttonSize.width, height: buttonSize.height }}
            >
              <IconWrapper disabled={btn.disabled} size={buttonSize.iconSize}>
                {btn.icon}
              </IconWrapper>
              <p className="button-text">{btn.name}</p>
              {btn.disabled && (
                <Tooltip className="tooltip">
                  {btn.name === "Save & Lock"
                    ? ""
                    : ""}
                </Tooltip>
              )}
            </Button>
          ))}
        </ButtonsContainer>
      </ContentWrapper>
    </HomePageContainer>
  );
};

export default ForecastManagementPage;
