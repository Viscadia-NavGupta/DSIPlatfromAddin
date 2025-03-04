import { styled } from "@mui/system";

// ✅ Sidebar Container - Tooltip is positioned here to avoid clipping
export const SidebarContainer = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "space-between",
  height: "100vh",
  width: "60px",
  backgroundColor: "#63676B",
  position: "relative", // ✅ Tooltip is positioned relative to this
  padding: "10px 0",
  overflow: "visible",
});

// ✅ Sidebar Button Wrapper - Only holds button, tooltip is outside
export const SidebarButtonWrapper = styled("div")({
  position: "relative",
  width: "60px",
  display: "flex",
  justifyContent: "center",
  marginBottom: "5px",
});

// ✅ Sidebar Button - Turns red on hover & when active
export const SidebarButton = styled("button")(({ isActive }) => ({
  width: "50px",
  height: "50px",
  borderRadius: "6px",
  border: "none",
  backgroundColor: isActive ? "#B4322A" : "transparent",
  color: isActive ? "#fff" : "#ccc",
  cursor: "pointer",
  transition: "background-color 0.3s, color 0.3s",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",

  "& svg": {
    fontSize: "1.4rem",
    fill: isActive ? "#fff" : "#ccc",
    transition: "fill 0.3s ease",
  },

  "&:hover": {
    backgroundColor: "#B4322A",
    color: "#fff",

    "& svg": {
      fill: "#fff",
    },
  },
}));

// ✅ Tooltip Styling - Now properly outside the sidebar buttons
export const TooltipContainer = styled("div")(({ visible }) => ({
  position: "fixed", // Ensure tooltip is always in view
  left: "70px", // Ensures it appears outside the sidebar
  backgroundColor: "#333",
  color: "#fff",
  padding: "6px 10px",
  borderRadius: "5px",
  fontSize: "0.8rem",
  whiteSpace: "nowrap",
  zIndex: 1000, // Ensures tooltip is above other elements
  boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
  opacity: visible ? 1 : 0, // Toggle visibility dynamically
  visibility: visible ? "visible" : "hidden",
  transition: "opacity 0.2s ease, visibility 0.2s ease",
}));

// Logout button uses the same style as a sidebar button.
export const LogoutButton = styled(SidebarButton)({
  marginTop: "auto",
});
