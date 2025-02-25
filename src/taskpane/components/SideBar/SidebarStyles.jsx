import { styled } from "@mui/system";

export const SidebarContainer = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start", // Align buttons to the top
  height: "100vh", // Ensure it takes full height
  width: "60px", // Ensure fixed width
  backgroundColor: "#63676B",
  color: "#fff",
  position: "relative",
  padding: "10px 0",
  gap: "10px", // Ensures spacing between buttons
});

export const SidebarButton = styled("button")(({ isActive }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "50px",
  height: "50px",
  border: "none",
  borderRadius: "8px", // Rounded corners
  backgroundColor: isActive ? "#b71c1c" : "transparent", // Active state background
  color: isActive ? "#fff" : "#ccc",
  marginBottom: "10px",
  cursor: "pointer",
  position: "relative", // Tooltip positioning
  transition: "background-color 0.3s, color 0.3s",

  "&:hover": {
    backgroundColor: "#b71c1c",
    color: "#fff",

    "& .tooltip": {
      opacity: 1,
      visibility: "visible",
    },
  },

  "& svg": {
    fontSize: "1.2rem",
  },
}));

export const LogoutButton = styled(SidebarButton)({
  marginTop: "auto", // Push logout to the bottom
});

export const Tooltip = styled("div")({
  position: "absolute",
  left: "60px", // Align tooltip to the right of the button
  top: "50%",
  transform: "translateY(-50%)", // Vertically center the tooltip
  backgroundColor: "#333",
  color: "#fff",
  padding: "5px 10px",
  borderRadius: "4px",
  fontSize: "0.8rem",
  whiteSpace: "nowrap",
  zIndex: 10, // Ensure it displays above other elements
  boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
  opacity: 0, // Initially hidden
  visibility: "hidden", // Hide tooltip initially
  transition: "opacity 0.3s ease, visibility 0.3s ease",
  pointerEvents: "none", // Prevent tooltip from interfering with hover
});
