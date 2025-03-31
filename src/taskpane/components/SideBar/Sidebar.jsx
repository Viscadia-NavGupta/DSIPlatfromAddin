import React, { useState, useEffect } from "react";
import { SidebarContainer, SidebarButtonWrapper, SidebarButton, LogoutButton, TooltipContainer } from "./SidebarStyles";
import { FaHome, FaSignOutAlt } from "react-icons/fa";
import ModelBuilder from "../Icons/Modelbuilder";
import ForecastManagement from "../Icons/ForecastManagement";
import AssumptionsCatalogue from "../Icons/AssumptionsCatalogue";
import RiskAnalytics from "../Icons/Risk&Analytics";
import PowerBi from "../Icons/PowerBi";
import ReportGenie from "../Icons/ReportGenie";
import { AiOutlineHome } from "react-icons/ai";


const Sidebar = ({ setPageValue, currentPage, handleLogout }) => {
  const [activePage, setActivePage] = useState(currentPage);
  const [tooltip, setTooltip] = useState({ text: "", visible: false, top: 0 });

  useEffect(() => {
    setActivePage(currentPage);
  }, [currentPage]);

  const sidebarButtons = [
    { name: "Home", icon: <AiOutlineHome size={20} />, action: "Home" },
    { name: "Model Management", icon: <ModelBuilder width={26} height={26} />, action: "InactiveFeaturea" },
    { name: "Forecast Management", icon: <ForecastManagement width={24} height={24} />, action: "ForecastManagement" },
    {
      name: "Assumptions Catalogue",
      icon: <AssumptionsCatalogue width={24} height={24} />,
      action: "InactiveFeaturea",
    },
    { name: "Risk & Analytics", icon: <RiskAnalytics width={24} height={24} />, action: "InactiveFeaturea" },
    { name: "Power BI Report", icon: <PowerBi width={24} height={24} />, action: "InactiveFeaturea" },
    { name: "Report Genie", icon: <ReportGenie width={24} height={24} />, action: "InactiveFeaturea" },
  ];

  const handleMouseEnter = (text, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      text,
      visible: true,
      top: rect.top + rect.height / 2 - 10 + window.scrollY, // Center vertically
      left: rect.left + rect.width + 10, // Position to right of the button
    });
  };

  const handleMouseLeave = () => {
    setTooltip({ text: "", visible: false, top: 0 });
  };

  return (
    <SidebarContainer>
      <div style={{ width: "100%" }}>
        {sidebarButtons.map((button, index) => (
          <SidebarButtonWrapper key={index}>
            <SidebarButton
              onClick={() => {
                setPageValue(button.action);
                setActivePage(button.action);
              }}
              isActive={activePage === button.action}
              onMouseEnter={(e) => handleMouseEnter(button.name, e)}
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
        <TooltipContainer visible={tooltip.visible} style={{ top: tooltip.top }}>
          {tooltip.text}
        </TooltipContainer>
      )}
    </SidebarContainer>
  );
};

export default Sidebar;
