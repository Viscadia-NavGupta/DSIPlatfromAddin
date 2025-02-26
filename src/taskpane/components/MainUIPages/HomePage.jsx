import React from "react";
import {
  HomePageContainer,
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
import * as AWSConnections from "../Middleware/AWSConnections";

const HomePage = ({ userName, setPageValue }) => {
  // ✅ **Pseudo function for Model Management**
  const handleModelManagement = () => {
    console.log("🔧 Model Management Clicked - Future feature integration.");
  };

  // ✅ **Function for Forecast Management**
  const handleForecastManagement = async () => {
    console.log("📊 Forecast Management Clicked");
    try {
      // let sheetData = await excelfucntions.extractLevelData();
      // let workbookdata = await savefucntion.saveData();
      await savefucntion.saveData();
      // // /await savefucntion.protectAllSheets("overarching");
      // await excelfucntions.generateLongFormData("US");
      //
    } catch (error) {
      console.error("Error fetching metadata:", error);
    }
  };

  // ✅ **Function for Assumptions Catalogue**
  const handleAssumptionsCatalogue = () => {
    console.log("📚 Assumptions Catalogue Clicked - Load Assumptions data here.");
    setPageValue("LoadScenario");
  };

  // ✅ **Function for Risk & Analytics (Currently Disabled)**
  const handleRiskAnalytics= async () => {
    console.log("⚠️ Risk & Analytics Clicked - This feature is under development.");
    await savefucntion.exportData2();
  };

  // ✅ **Function for Power BI Report**
  const handlePowerBIReport = async () => {
    console.log("📊 Power BI Report Clicked - Open Power BI dashboard.");
    await savefucntion.saveData();
  };

  // ✅ **Function for Report Genie**
  const handleReportGenie = async () => {
    console.log("📜 Report Genie Clicked - Generate reports.");
    await excelfucntions.generateLongFormData("US");
    // await excelfucntions.extractNamedRanges();
  };

  const buttons = [
    {
      name: "Model Management",
      icon: <ModelBuilder />,
      action: handleModelManagement,
      disabled: true, // This feature is disabled
    },
    {
      name: "Forecast Management",
      icon: <ForecastManagement />,
      action: handleForecastManagement,
      disabled: false,
    },
    {
      name: "Assumptions Catalogue",
      icon: <AssumptionsCatalogue />,
      action: handleAssumptionsCatalogue,
      disabled: false,
    },
    {
      name: "Risk & Analytics",
      icon: <RiskAnalytics />,
      action: handleRiskAnalytics,
      disabled: false, // This feature is disabled
    },
    {
      name: "Power BI Report",
      icon: <PowerBi />,
      action: handlePowerBIReport,
      disabled: false,
    },
    {
      name: "Report Genie",
      icon: <ReportGenie />,
      action: handleReportGenie,
      disabled: false,
    },
  ];

  return (
    <HomePageContainer>
      <WelcomeContainer>
        <h1>Welcome,</h1>
        <NameContainer>
          <h2>{userName}</h2>
        </NameContainer>
      </WelcomeContainer>

      <ButtonsContainer>
        {buttons.map((button, index) => (
          <Button key={index} onClick={!button.disabled ? button.action : undefined} disabled={button.disabled}>
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
    </HomePageContainer>
  );
};

export default HomePage;
