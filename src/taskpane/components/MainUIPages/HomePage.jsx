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

// (You can remove unused imports if you like)
import * as excelconnections from "../Middleware/DEVExcelConnections";
import * as inputfuncitons from "../Middleware/inputfile";
import * as ACCode from "../Middleware/TestExcelconnection";
import * as ProdExcelConnections from "../Middleware/ExcelConnection";
import * as InputfileConnections from "../Middleware/inputfile";

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

  // Function to open Google (or Power BI link) in a new tab
  const handleOpenGoogle = () => {
    window.open("https://app.powerbi.com/groups/8432e502-aff3-49cd-9ad9-e3ccb1ab4eea/reports/1fb0132c-fcf1-4bd5-9ce8-37d7e35adb0e/ca00450869d3c67885cf?experience=power-bi", "_blank");
  };

  const buttons = [
    {
      name: "Model Management",
      icon: <ModelBuilder width={buttonSize.iconSize} height={buttonSize.iconSize} />,
      action: () => ProdExcelConnections.exportData2(),
      disabled: true,
    },
    {
      name: "Forecast Management",
      icon: <ForecastManagement width={buttonSize.iconSize} height={buttonSize.iconSize} />,
      action: () => setPageValue("ForecastManagement"),
      disabled: false,
    },
    {
      name: "Forecast Library",
      icon: <AssumptionsCatalogue width={buttonSize.iconSize} height={buttonSize.iconSize} />,
      action: () => setPageValue("ForecastLibrarypage"),
      disabled: false,
    },
    // {
    //   name: "Risk & Analytics",
    //   icon: <RiskAnalytics width={buttonSize.iconSize} height={buttonSize.iconSize} />,
    //   action: () => ProdExcelConnections.generateLongFormData("US", "DataModel"),
    //   disabled: false,
    // },
    {
      name: "Power BI Report",
      icon: <PowerBi width={buttonSize.iconSize} height={buttonSize.iconSize} />,
      // ← Changed this to open Google (or any URL) instead of saveData()
      action: () => setPageValue("PowerbiManegment"),
      disabled: false,
    },
    // {
    //   name: "Report Genie",
    //   icon: <ReportGenie width={buttonSize.iconSize} height={buttonSize.iconSize} />,
    //   action: () => ProdExcelConnections.writeYesNoToNamedRange("Cloud_Macro_RUN", true),
    //   disabled: false,
    // },
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
