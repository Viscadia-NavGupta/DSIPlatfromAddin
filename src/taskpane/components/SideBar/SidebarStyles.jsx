import { styled } from "@mui/system";

// Sidebar container
export const SidebarContainer = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "space-between",
  height: "100vh",
  width: "60px",
  backgroundColor: "#63676B",
  position: "relative",
  padding: "10px 0",
  overflow: "visible",
});

// Wrapper for each button
export const SidebarButtonWrapper = styled("div")({
  position: "relative",
  width: "60px",
  display: "flex",
  justifyContent: "center",
  marginBottom: "5px",
});

// Button itself
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

  // Native disabled state styling:
  "&:disabled": {
    backgroundColor: "transparent",
    color: "#777",
    cursor: "not-allowed",
    "& svg": {
      fill: "#777",
    },
  },
}));

// Tooltip
export const TooltipContainer = styled("div")(({ visible }) => ({
  position: "fixed",
  backgroundColor: "#333",
  color: "#fff",
  padding: "6px 10px",
  borderRadius: "5px",
  fontSize: "0.8rem",
  whiteSpace: "nowrap",
  zIndex: 1000,
  opacity: visible ? 1 : 0,
  visibility: visible ? "visible" : "hidden",
  transition: "opacity 0.2s ease, visibility 0.2s ease",
}));

// Logout uses the same base styling
export const LogoutButton = styled(SidebarButton)({
  marginTop: "auto",
});
