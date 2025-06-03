// src/pages/ForecastManagementPage.jsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { MdSaveAlt, MdOutlineSave } from "react-icons/md";
import { CiLock } from "react-icons/ci";
import { DataFrame } from "dataframe-js";

import { specialModelIds } from "../../Middleware/Model Config";

import {
  HomePageContainer,
  ContentWrapper,
  WelcomeContainer,
  ButtonsContainer,
  Button,
  Tooltip,
  BackButtonIcon,
  IconWrapper,
  MessageBox, // import the loading‐message style
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

        const mt = (ranges.ModelType.values[0][0] || "")
          .toString()
          .trim();
        const id = (ranges.ModelID.values[0][0] || "")
          .toString()
          .trim();

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
    [buttonSize.iconSize, saveLockEnabled, setPageValue]
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
    return <MessageBox>Checking cloud compatibility, please wait...</MessageBox>;
  }

  if (modelType !== "FORECAST") {
    return (
      <HomePageContainer>
        <ContentWrapper>
          <WelcomeContainer>
            <BackButtonIcon as={FaArrowLeft} size={24} onClick={onBack} />
            <h1>Forecast Management</h1>
          </WelcomeContainer>
          <p style={{ color: "#B4322A" }}>No authorised Forecast Models found.</p>
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
                    ? "Feature not activated."
                    : "Feature not activated."}
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
