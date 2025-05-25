import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { MdSaveAlt, MdOutlineSave } from "react-icons/md";
import { CiLock } from "react-icons/ci";
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
  const [buttonSize, setButtonSize] = useState({
    width: 90,
    height: 75,
    fontSize: "0.7rem",
    iconSize: 32,
  });
  const [modelType, setModelType] = useState("");
  const [modelIDValue, setModelIDValue] = useState("");
  const [loading, setLoading] = useState(true);

  // 1️⃣ Hard-coded DataFrame of allowed IDs
  const allowedDF = useMemo(() => {
    return new DataFrame([
      { model_id: "f4e9582c-9c85-4b21-ae66-4137a1ed1ec5" }, // IDXD Model ID
      { model_id: "f4e9582c-9c85-4b21-ae66-4137a1ed1ec7" },// her3 Model ID
    ]);
  }, []);

  // 2️⃣ Read ModelType & ModelID from the Excel sheet
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

  // 3️⃣ On mount, run the Excel check
  useEffect(() => {
    checkModelType().finally(() => setLoading(false));
  }, [checkModelType]);

  // 4️⃣ Compute whether Save & Lock should be enabled
  const saveLockEnabled = useMemo(() => {
    if (loading) return false;
    if (modelType === "AGGREGATOR") return false;

    const normId = modelIDValue.toString().trim().toLowerCase();
    // pull the allowed list out of the DataFrame
    const allowedIds = allowedDF
      .toCollection()
      .map((r) => r.model_id.toString().trim().toLowerCase());

    return allowedIds.includes(normId);
  }, [loading, modelType, modelIDValue, allowedDF]);

  // 5️⃣ Button definitions
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

  // 6️⃣ Responsive sizing logic (unchanged)
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
                    ? loading
                      ? "Checking permissions..."
                      : "You’re not allowed for this model."
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
