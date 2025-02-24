import React from "react";
import {
  SidebarContainer,
  SidebarButton,
  LogoutButton,
  Tooltip,
} from "./SidebarStyles";

// Importing Icon Components
import ModelBuilder from "../Icons/Modelbuilder";
import ForecastManagement from "../Icons/ForecastManagement";
import AssumptionsCatalogue from "../Icons/AssumptionsCatalogue";
import RiskAnalytics from "../Icons/Risk&Analytics";
import PowerBi from "../Icons/PowerBi";
import ReportGenie from "../Icons/ReportGenie";

import { FaHome, FaSignOutAlt } from "react-icons/fa";

const Sidebar = ({ setPageValue, currentPage, handleLogout }) => {
  const iconColor = "#FFFFFF"; // Universal icon color

  const sidebarButtons = [
    { name: "Home", icon: <FaHome color={iconColor} />, action: () => setPageValue("Home") },
    { name: "Model Management", icon: <ModelBuilder fill={iconColor} />, action: () => setPageValue("SaveForecastPage") },
    { name: "Forecast Management", icon: <ForecastManagement fill={iconColor} />, action: () => setPageValue("ForecastManagement") },
    { name: "Assumptions Catalogue", icon: <AssumptionsCatalogue fill={iconColor} />, action: () => setPageValue("AssumptionsCatalogue") },
    { name: "Risk & Analytics", icon: <RiskAnalytics fill={iconColor} />, action: () => setPageValue("InactiveFeature") },
    { name: "Power BI Report", icon: <PowerBi fill={iconColor} />, action: () => setPageValue("PowerBi") },
    { name: "Report Genie", icon: <ReportGenie fill={iconColor} />, action: () => setPageValue("ReportGenie") },
  ];

  return (
    <SidebarContainer>
      {/* Sidebar Buttons */}
      {sidebarButtons.map((button, index) => (
        <SidebarButton
          key={index}
          onClick={button.action}
          isActive={currentPage === button.name}
        >
          {button.icon}
          <Tooltip className="tooltip">{button.name}</Tooltip>
        </SidebarButton>
      ))}

      {/* Logout Button */}
      <LogoutButton onClick={handleLogout}>
        <FaSignOutAlt color={iconColor} />
        <Tooltip className="tooltip">Logout</Tooltip>
      </LogoutButton>
    </SidebarContainer>
  );
};

export default Sidebar;
