import React, { useState, useEffect, useCallback } from "react";
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
import * as AWSconnect from "../Middleware/AWSConnections";
import * as testexcel from "../Middleware/TestExcelconnection";

// Importing Icon Components
import AssumptionsCatalogue from "../Icons/AssumptionsCatalogue";
import ForecastManagement from "../Icons/ForecastManagement";
import ModelBuilder from "../Icons/Modelbuilder";
import PowerBi from "../Icons/PowerBi";
import ReportGenie from "../Icons/ReportGenie";
import RiskAnalytics from "../Icons/Risk&Analytics";

const HomePage = ({ userName, setPageValue }) => {
  const [buttonSize, setButtonSize] = useState({ width: 90, height: 75, fontSize: "0.7rem", iconSize: 25 });

  // Memoize the updateSize function to prevent unnecessary re-renders
  const updateSize = useCallback(() => {
    const availableWidth = window.innerWidth - 130; // Adjust for sidebar
    const availableHeight = window.innerHeight - 180; // Adjust for header/footer

    const columns = Math.max(2, Math.floor(availableWidth / 110)); // Ensure at least 2 buttons per row
    const rows = Math.max(2, Math.floor(availableHeight / 110)); // Ensure at least 2 rows

    const newSize = Math.min(availableWidth / columns, availableHeight / rows, 90); // Smaller buttons
    const fontSize = `${Math.max(0.7, newSize / 10)}rem`; // Smaller text
    const iconSize = newSize * 0.4; // Smaller icons

    setButtonSize({ width: newSize, height: newSize * 0.8, fontSize, iconSize });
  }, []);

  // Optimize the resize handler with debounce
  useEffect(() => {
    updateSize();
    
    // Debounce resize handler for better performance
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

  // Optimize AWS operations
  const handleForecastManagement = useCallback(async () => {
    try {
      setPageValue("LoadingCircleComponent", "Loading Forecast Management...");
      await AWSconnect.uploadFileToS3(
        "Flat File",
        "https://dsivis-dev-upload-bucket.s3.amazonaws.com/SAVE_FORECAST/01a26306-845a-4034-9d77-e7c6e864141d.xlsx?AWSAccessKeyId=ASIAZAI4HCB6LGC4PI23&Signature=w%2BhPKE4m88QbhhsVoklNp7HqG6c%3D&x-amz-acl=bucket-owner-full-control&content-type=application%2Fvnd.openxmlformats-officedocument.spreadsheetml.sheet&x-amz-security-token=IQoJb3JpZ2luX2VjEPr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJGMEQCIB7ReCD20h6sxnROPurXkAiUVhFDMAGx6ansm0KBwn65AiBpeCCzZaS5%2By09o0UOLq16xi7RefeXeMm5c1q4yOd%2FGyqNAwhDEAAaDDYxOTA3MTM0NDc2NCIMm9fbQXA8lIQuCzKaKuoCl6MzoDAoIkUypl2AaG%2FVEAzdKUG0cdl5hudB%2Bs7zR21oDMenWm8DMoV0fojuRTMsEpggA%2BzlWtRaHuxJLvqvBE6%2B%2BdfM6Qx53XPPexUhaSKhwF2gaCPdfdTyNdEgF3cGlWzpTAeBldwUvBb05GCfSq5wn4ys9zWW82Xy9D4czZtBT8USKOZi%2Fx0Fgy0oQfYRqAoZBqt3Ywa5Rs6S%2FrVhNtMyYjifZx2FskN%2FIOcaO5GN5r71FHRXRZc46l7rLMS0MlnbSD%2FNlJ1EEzOYmcOaC%2F4uDuTsj0L6LoGl2wRtLaNzBwDPS8As56YUWFItkmIJ5r58kwgZ8VdvSLE3bUmNgV%2BvHZYITktOCIPmzzxNe1iaaio37aYppnlwhK1ofJvTrsFtB2lT06PSaktDidaLOX41Sccso04zI9G%2B%2BCENMhRCgrB%2BCzNmKecyincuwSg3vrIIFq6gq9NWEsbKIG1Bm2J2NlJbg%2Fv8vTAw6f2qvgY6ngG5j43vfAQS7TYP2Arh%2Bp2Ry4MQtoTRaGhV5GiKxHOr6xxCmNddC%2F4mlxYJXyQeJvdMN4dmxluILAx72yHVetD6yqPbGbocHZhPw4Bot92imgwvsDeFNVQN2YPJnXeoLPPt2jdFXdLPXGklZXiX5rPucvDdDYi6xUTMWAhvGiCXpkKwWD2w0W8VyFAHcy6z%2Bmo5MdI4%2FtoI%2FwFqOf056Q%3D%3D&Expires=1741343994"
      );
      setPageValue("ForecastManagement");
    } catch (error) {
      console.error("Error in Forecast Management:", error);
      setPageValue("Home");
      alert("Error loading Forecast Management. Please try again.");
    }
  }, [setPageValue]);

  // Optimize Report Genie operation
  const handleReportGenie = useCallback(async () => {
    try {
      setPageValue("LoadingCircleComponent", "Generating report...");
      console.log("Test console output function called: This is a test message.");
      const Longformdata = await excelfucntions.generateLongFormData("US");
      await AWSconnect.uploadFileToS3FromArray(
        Longformdata,
        "Test",
        "https://dsivis-dev-upload-bucket.s3.amazonaws.com/INPUT_FILE/testnew.csv?AWSAccessKeyId=ASIAZAI4HCB6BPQZ3HPI&Signature=oR3tbCWFCK1pV26f3f0Mxa3k1oA%3D&x-amz-acl=bucket-owner-full-control&content-type=text%2Fcsv&x-amz-security-token=IQoJb3JpZ2luX2VjEHgaCXVzLWVhc3QtMSJHMEUCICOi5VgTX1%2B58zVQj3KA3jUK%2FrOn5c%2FwhbJmuplQ1LtNAiEA53NFvRggJ06FTgs01dKrqgefO7E8eZ7pmCmSbUeHHdIqlgMIwP%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw2MTkwNzEzNDQ3NjQiDIMaZVLiloiyyx8L8irqAiRSY%2FmhMMiRkyGGuxXUpwUpihd1E602raMXDvnED9somcW%2FyTZ1NmIJV5Hm10SwGG9%2FelnCpTy39dah4K92L6jRE2Ni3sipYpfnSAshLtwJIe9%2FNwOaSKqPIT5%2BB7XPEh3eAzVqtgRAMcNZglUjecG95fjA87YI1utPDfELneGQQoKXNlMZZnUcsLzYqmYDqmPIUZBWO8VGzWq7BRyZGZLahjshJALs76428jrVB7vQ0ixHnb1cxbeJHy5hMELx39dShrqhUpSepHS6oXbY3dFjA57uu0x1FiNQvm5mBwNYPj8MZFv6PN346OEQtHbYIbmlePC4H4Q5jJnqW1LMmsmbYLyDtcdJfRRsv%2Bt9HmSzIeM0lFH5Ti0vymtaBi6hmo3KIYsTeIZpz5rUFDHDE31Jo12I%2Bw0qftT87yYDr220oFgK72YLEVFNk0nC43fdJz5KxBIkSU2Yk0eg%2FojxdSb%2BXNOZa2PgSqAxMNTLxr4GOp0BzYefkDcgOU6yEwsv1T2%2FRaVKe6pmHTRY6SvzHGgS5Zoof0OnzO%2BlTICUE0K%2B644h4fvK2S8LDmv%2Bj%2Fe0jzQlUZ7LeSMQiE75%2BfqnfXmnr0%2B3lJpSvcpTK9lqk1q%2FvCOBo0K62CE72x8DrmcaAdCNZehY5ACVqdqtza2iUYHoGYx2av6npzcCZateMkiwdONOxd%2BAGzLlaKdNl0mjPQ%3D%3D&Expires=1741796326"
      );
      setPageValue("Home");
      alert("Report generated successfully!");
    } catch (error) {
      console.error("Error in Report Genie:", error);
      setPageValue("Home");
      alert("Error generating report. Please try again.");
    }
  }, [setPageValue]);

  // Define buttons with memoized handlers
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
      action: handleForecastManagement,
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
      action: async () => {
        setPageValue("LoadingCircleComponent", "Processing risk analytics...");
        await savefucntion.exportData2();
        setPageValue("Home");
      },
      disabled: true,
    },
    {
      name: "Power BI Report",
      icon: <PowerBi width={buttonSize.iconSize} height={buttonSize.iconSize} />,
      action: async () => {
        setPageValue("LoadingCircleComponent", "Saving data...");
        await savefucntion.saveData();
        setPageValue("Home");
      },
      disabled: true,
    },
    {
      name: "Report Genie",
      icon: <ReportGenie width={buttonSize.iconSize} height={buttonSize.iconSize} />,
      action: handleReportGenie,
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
            <Button
              key={index}
              onClick={!button.disabled ? button.action : undefined}
              disabled={button.disabled}
              style={{ width: buttonSize.width, height: buttonSize.height, fontSize: buttonSize.fontSize }}
            >
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