import React, { useState, useEffect } from "react";
import {
  HomePageContainer,
  ContentWrapper,
  WelcomeContainer,
  NameContainer,
  ButtonsContainer,
  Button,
  DisabledOverlay,
  Tooltip,
} from "./HomePageStyles";
import * as excelfucntions from "../Middleware/ExcelConnection";
import * as savefucntion from "../Middleware/inputfile";

// Importing Icon Components
import AssumptionsCatalogue from "../Icons/AssumptionsCatalogue";
import ForecastManagement from "../Icons/ForecastManagement";
import ModelBuilder from "../Icons/Modelbuilder";
import PowerBi from "../Icons/PowerBi";
import ReportGenie from "../Icons/ReportGenie";
import RiskAnalytics from "../Icons/Risk&Analytics";

const HomePage = ({ userName, setPageValue }) => {
  const [buttonSize, setButtonSize] = useState({ width: 90, height: 75, fontSize: "0.7rem", iconSize: 25 });

  const updateSize = () => {
    const availableWidth = window.innerWidth - 130; // Adjust for sidebar
    const availableHeight = window.innerHeight - 180; // Adjust for header/footer

    const columns = Math.max(2, Math.floor(availableWidth / 110)); // ✅ Ensure at least 2 buttons per row
    const rows = Math.max(2, Math.floor(availableHeight / 110)); // ✅ Ensure at least 2 rows

    const newSize = Math.min(availableWidth / columns, availableHeight / rows, 90); // ✅ Smaller buttons
    const fontSize = `${Math.max(0.7, newSize / 10)}rem`; // ✅ Smaller text
    const iconSize = newSize * 0.4; // ✅ Smaller icons

    setButtonSize({ width: newSize, height: newSize * 0.8, fontSize, iconSize });
  };

  useEffect(() => {
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const buttons = [
    { name: "Model Management", icon: <ModelBuilder width={buttonSize.iconSize} height={buttonSize.iconSize} />, action: () => {}, disabled: true },
    { name: "Forecast Management", icon: <ForecastManagement width={buttonSize.iconSize} height={buttonSize.iconSize} />, action: async () => await savefucntion.saveData(), disabled: false },
    { name: "Assumptions Catalogue", icon: <AssumptionsCatalogue width={buttonSize.iconSize} height={buttonSize.iconSize} />, action: () => setPageValue("LoadScenario"), disabled: false },
    { name: "Risk & Analytics", icon: <RiskAnalytics width={buttonSize.iconSize} height={buttonSize.iconSize} />, action: async () => await savefucntion.exportData2(), disabled: false },
    { name: "Power BI Report", icon: <PowerBi width={buttonSize.iconSize} height={buttonSize.iconSize} />, action: async () => await savefucntion.saveData(), disabled: false },
    { name: "Report Genie", icon: <ReportGenie width={buttonSize.iconSize} height={buttonSize.iconSize} />, action: async () => await excelfucntions.generateLongFormData("US"), disabled: false },
  ];

  return (
    <HomePageContainer>
      <ContentWrapper>
        <WelcomeContainer style={{ fontSize: buttonSize.fontSize }}>
          <h1>Welcome,</h1>
          <NameContainer>
            <h2>{userName}</h2>
          </NameContainer>
        </WelcomeContainer>

        <ButtonsContainer>
          {buttons.map((button, index) => (
            <Button key={index} onClick={!button.disabled ? button.action : undefined} disabled={button.disabled} style={{ width: buttonSize.width, height: buttonSize.height, fontSize: buttonSize.fontSize }}>
              {button.icon}
              <p>{button.name}</p>
              {button.disabled && (
                <>
                  <DisabledOverlay>i</DisabledOverlay>
                  <Tooltip>Feature not activated. Please contact your admin.</Tooltip>
                </>
              )}
            </Button>
          ))}
        </ButtonsContainer>
      </ContentWrapper>
    </HomePageContainer>
  );
};

export default HomePage;
