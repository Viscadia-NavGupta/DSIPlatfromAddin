import React, { useState, useEffect } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { MdSaveAlt, MdOutlineSave } from "react-icons/md";
import { CiLock } from "react-icons/ci";
import { AiOutlineSetting } from "react-icons/ai";

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
  const [buttonSize, setButtonSize] = useState({ width: 90, height: 75, fontSize: "0.7rem", iconSize: 32 });

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
    { name: "Load", icon: <MdSaveAlt size={buttonSize.iconSize} />, action: () => setPageValue("LoadScenario"), disabled: false },
    { name: "Save", icon: <MdOutlineSave size={buttonSize.iconSize} />, action: () => setPageValue("SaveForecastPage"), disabled: false },
    { name: "Lock/Submit", icon: <CiLock size={buttonSize.iconSize} />, action: () => setPageValue("SaveandLockScenario"), disabled: false },
  ];

  return (
    <HomePageContainer>
      <ContentWrapper>
        <WelcomeContainer>
          <BackButtonIcon as={FaArrowLeft} size={24} onClick={onBack} />
          <h1>Forecast Management</h1>
        </WelcomeContainer>

        <ButtonsContainer>
          {buttons.map((button, index) => (
            <Button key={index} onClick={!button.disabled ? button.action : undefined} disabled={button.disabled}>
              <IconWrapper disabled={button.disabled} size={buttonSize.iconSize}>{button.icon}</IconWrapper>
              <p className="button-text">{button.name}</p>
              {button.disabled && (
                <Tooltip className="tooltip">Feature not activated.</Tooltip>
              )}
            </Button>
          ))}
        </ButtonsContainer>
      </ContentWrapper>
    </HomePageContainer>
  );
};

export default ForecastManagementPage;