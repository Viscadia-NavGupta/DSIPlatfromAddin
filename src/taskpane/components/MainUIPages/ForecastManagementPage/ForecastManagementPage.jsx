import React from "react";
import { FaArrowLeft, FaDownload, FaCog, FaCloud, FaSave, FaLock } from "react-icons/fa";
import {
  PageContainer,
  HeaderContainer,
  BackButton,
  Title,
  ButtonsContainer,
  Button,
  FooterLink,
} from "./ForecastManagementPageStyles";

const ForecastManagementPage = ({ setPageValue, onBack }) => {
  // ✅ Function to handle button clicks and navigate pages
  const handleButtonClick = (page) => {
    if (typeof setPageValue === "function") {
      console.log(`Navigating to: ${page}`);
      setPageValue(page);
    } else {
      console.error("setPageValue is not a function!");
    }
  };

  const buttons = [
    { name: "Load", icon: <FaDownload />, action: () => handleButtonClick("LoadScenario"), active: true },
    { name: "Compute", icon: <FaCog />, action: () => handleButtonClick("ComputePage") },
    { name: "Outputs", icon: <FaCloud />, action: () => handleButtonClick("OutputsPage") },
    { name: "Save", icon: <FaSave />, action: () => handleButtonClick("SaveForecastPage") },
    { name: "Lock", icon: <FaLock />, action: () => handleButtonClick("LockPage") },
  ];

  return (
    <PageContainer>
      {/* Header */}
      <HeaderContainer>
        <BackButton onClick={onBack}>
          <FaArrowLeft />
        </BackButton>
        <Title>Forecast Management</Title>
      </HeaderContainer>

      {/* Buttons Section */}
      <ButtonsContainer>
        {buttons.map((button, index) => (
          <Button key={index} onClick={button.action} className={button.active ? "active" : ""}>
            {button.icon}
            <p>{button.name}</p>
          </Button>
        ))}
      </ButtonsContainer>

      {/* Footer Link */}
      <FooterLink href="https://example.com" target="_blank" rel="noopener noreferrer">
        ACE™ Navigation
      </FooterLink>
    </PageContainer>
  );
};

export default ForecastManagementPage;
