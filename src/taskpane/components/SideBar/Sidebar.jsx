import React, { useState, useEffect } from "react";
import {
  SidebarContainer,
  SidebarButtonWrapper,
  SidebarButton,
  LogoutButton,
  TooltipContainer,
} from "./SidebarStyles";
import { FaSignOutAlt } from "react-icons/fa";
import { AiOutlineHome } from "react-icons/ai";
import ModelBuilder from "../Icons/Modelbuilder";
import ForecastManagement from "../Icons/ForecastManagement";
import AssumptionsCatalogue from "../Icons/AssumptionsCatalogue";
import RiskAnalytics from "../Icons/Risk&Analytics";
import PowerBi from "../Icons/PowerBi";
import ReportGenie from "../Icons/ReportGenie";

const Sidebar = ({ setPageValue, currentPage, handleLogout }) => {
  const [activePage, setActivePage] = useState(currentPage);
  const [tooltip, setTooltip] = useState({
    text: "",
    visible: false,
    top: 0,
    left: 0,
  });

  useEffect(() => {
    setActivePage(currentPage);
  }, [currentPage]);

  const sidebarButtons = [
    {
      name: "Home",
      icon: <AiOutlineHome size={20} />,
      action: "Home",
      disabled: false,
    },
    {
      name: "Model Management",
      icon: <ModelBuilder width={26} height={26} />,
      action: null,               // No real action when enabled; it stays disabled.
      disabled: false,             // <– locked feature
      message: "Feature is locked", // Tooltip text when disabled
    },
    {
      name: "Forecast Management",
      icon: <ForecastManagement width={24} height={24} />,
      action: "ForecastManagement",
      disabled: false,
    },
    {
      name: "Forecast Library",
      icon: <AssumptionsCatalogue width={24} height={24} />,
      action: "ForecastLibrarypage",
      disabled: false,
    },
    {
      name: "Power BI Report",
      icon: <PowerBi width={24} height={24} />,
      action: null, // we open Google here
      disabled: false,
    },
  ];

  const handleMouseEnter = (text, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      text,
      visible: true,
      top: rect.top + rect.height / 2 - 10 + window.scrollY,
      left: rect.left + rect.width + 10,
    });
  };

  const handleMouseLeave = () => {
    setTooltip({ text: "", visible: false, top: 0, left: 0 });
  };

  return (
    <SidebarContainer>
      <div style={{ width: "100%" }}>
        {sidebarButtons.map((button, index) => (
          <SidebarButtonWrapper key={index}>
            <SidebarButton
              disabled={button.disabled} // disable natively if locked
              isActive={
                activePage === button.action ||
                (button.name === "Power BI Report" &&
                  activePage === "PowerBI")
              }
              onClick={() => {
                if (button.disabled) {
                  // do nothing if locked
                  return;
                }

                if (button.name === "Power BI Report") {
                  // Open Google in a new tab
                  window.open("https://www.google.com", "_blank");
                  return;
                }

                if (button.action) {
                  setPageValue(button.action);
                  setActivePage(button.action);
                }
              }}
              onMouseEnter={(e) =>
                handleMouseEnter(
                  button.disabled ? button.message : button.name,
                  e
                )
              }
              onMouseLeave={handleMouseLeave}
            >
              {button.icon}
            </SidebarButton>
          </SidebarButtonWrapper>
        ))}
      </div>

      <SidebarButtonWrapper>
        <LogoutButton
          onClick={handleLogout}
          onMouseEnter={(e) => handleMouseEnter("Logout", e)}
          onMouseLeave={handleMouseLeave}
        >
          <FaSignOutAlt size={20} />
        </LogoutButton>
      </SidebarButtonWrapper>

      {tooltip.visible && (
        <TooltipContainer
          visible={tooltip.visible}
          style={{ top: tooltip.top, left: tooltip.left }}
        >
          {tooltip.text}
        </TooltipContainer>
      )}
    </SidebarContainer>
  );
};

export default Sidebar;
