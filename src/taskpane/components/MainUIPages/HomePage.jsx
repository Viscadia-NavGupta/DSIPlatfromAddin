import React, { useState, useEffect, useCallback } from "react";
import {
  HomePageContainer,
  ContentWrapper,
  WelcomeContainer,
  NameContainer,
  ButtonsContainer,
  Button,
  TooltipWrapper,
  Tooltip,
} from "./HomePageStyles";

// Importing Icon Components
import AssumptionsCatalogue from "../Icons/AssumptionsCatalogue";
import ForecastManagement from "../Icons/ForecastManagement";
import ModelBuilder from "../Icons/Modelbuilder";
import PowerBi from "../Icons/PowerBi";
import ReportGenie from "../Icons/ReportGenie";
import RiskAnalytics from "../Icons/Risk&Analytics";
import * as excelconnections from "../Middleware/ExcelConnection";

const HomePage = ({ userName, setPageValue }) => {
  const [buttonSize, setButtonSize] = useState({
    width: 90,
    height: 75,
    fontSize: "0.7rem",
    iconSize: 25,
  });

  const updateSize = useCallback(() => {
    const availableWidth = window.innerWidth - 130;
    const availableHeight = window.innerHeight - 180;

    const columns = Math.max(2, Math.floor(availableWidth / 110));
    const rows = Math.max(2, Math.floor(availableHeight / 110));

    const newSize = Math.min(availableWidth / columns, availableHeight / rows, 90);
    const fontSize = `${Math.max(0.7, newSize / 10)}rem`;
    const iconSize = newSize * 0.4;

    setButtonSize({ width: newSize, height: newSize * 0.8, fontSize, iconSize });
  }, []);

  useEffect(() => {
    updateSize();
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateSize, 150);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, [updateSize]);

  const buttons = [
    {
      name: "Model Management",
      icon: <ModelBuilder width={buttonSize.iconSize} height={buttonSize.iconSize} />,
      action: () => {},
      disabled: true,
    },
    {
      name: "Forecast Management",
      icon: <ForecastManagement width={buttonSize.iconSize} height={buttonSize.iconSize} />,
      action: () => setPageValue("ForecastManagement"),
      disabled: false,
    },
    {
      name: "Assumptions Catalogue",
      icon: <AssumptionsCatalogue width={buttonSize.iconSize} height={buttonSize.iconSize} />,
      action: () => setPageValue("LoadScenario"),
      disabled: true,
    },
    {
      name: "Risk & Analytics",
      icon: <RiskAnalytics width={buttonSize.iconSize} height={buttonSize.iconSize} />,
      action: () => setPageValue("RiskAnalytics"),
      disabled: true,
    },
    {
      name: "Power BI Report",
      icon: <PowerBi width={buttonSize.iconSize} height={buttonSize.iconSize} />,
      action: () => setPageValue("PowerBIReport"),
      disabled: true,
    },
    {
      name: "Report Genie",
      icon: <ReportGenie width={buttonSize.iconSize} height={buttonSize.iconSize} />,
      action: () => excelconnections.generateLongFormData(),
      disabled: false,
    },
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
            <TooltipWrapper key={index}>
              <Button
                onClick={!button.disabled ? button.action : undefined}
                disabled={button.disabled}
                style={{
                  width: buttonSize.width,
                  height: buttonSize.height,
                  fontSize: buttonSize.fontSize,
                  position: "relative",
                }}
              >
                {button.icon}
                <p>{button.name}</p>
              </Button>

              {button.disabled && <Tooltip className="tooltip">Feature is locked</Tooltip>}
            </TooltipWrapper>
          ))}
        </ButtonsContainer>
      </ContentWrapper>
    </HomePageContainer>
  );
};

export default HomePage;
