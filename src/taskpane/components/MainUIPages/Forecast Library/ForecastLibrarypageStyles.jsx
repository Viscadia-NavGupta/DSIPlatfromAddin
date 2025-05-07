import { styled } from "@mui/system";

export const NameContainer = styled("div")({
  marginTop: "0.5rem",
});

// Main container ensuring full-page scrolling when needed
export const HomePageContainer = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  height: "100vh",
  width: "100%",
  boxSizing: "border-box",
  overflowY: "auto",
  overflowX: "hidden",
  paddingBottom: "10px",
});

// Wrapper to keep content centered properly
export const ContentWrapper = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "100%",
  maxWidth: "100%",
  flexGrow: 1,
  overflowY: "auto",
  overflowX: "hidden",
});

// Welcome container for header text and back button
export const WelcomeContainer = styled("div")({
  textAlign: "center",
  marginBottom: "10px",
  display: "flex",
  alignItems: "center",
  gap: "16px",
  "& h1": {
    fontSize: "clamp(1.11rem, 2vw, 1.8rem)",
    color: "#B4322A",
    fontWeight: "bold",
  },
});

// Back Button Icon styling
export const BackButtonIcon = styled("svg")({
  cursor: "pointer",
  color: "#707477",
  transition: "color 0.3s ease",
  "&:hover": {
    color: "#B4322A",
  },
});

// General Icon formatting inside buttons
export const IconWrapper = styled("div")(({ disabled, size }) => ({
  width: size ? `${size}px` : "32px",
  height: size ? `${size}px` : "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "6px",
  color: disabled ? "#d3d3d3" : "#63666A",
  transition: "color 0.3s ease",
  "& svg": {
    width: "90%",  // Adjusted for better responsiveness
    height: "90%",
  },
  "&:hover": {
    color: disabled ? "#d3d3d3" : "#fff",
  },
}));

// Buttons container with grid layout
export const ButtonsContainer = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "16px",
  width: "90%",
  justifyItems: "center",
  padding: "10px",
});

// Individual button styles ensuring text and icons fit
export const Button = styled("button")(({ disabled }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #ddd",
  borderRadius: "8px",
  backgroundColor: disabled ? "#f2f2f2" : "#fff",
  cursor: disabled ? "not-allowed" : "pointer",
  textAlign: "center",
  position: "relative",
  overflow: "visible", // Ensure overflow does not hide tooltip
  padding: "3px",
  width: "100%",
  height: "75px",
  "& svg": {
    width: "35%",
    height: "35%",
    marginBottom: "0.2rem",
    fill: disabled ? "#d3d3d3" : "#63666A",
  },
  "& p": {
    fontSize: "clamp(0.6rem, 0.8vw, 0.9rem)",
    color: disabled ? "#d3d3d3" : "#63666A",
    margin: 0,
    textAlign: "center",
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflow: "hidden",
    maxWidth: "90%",
  },
  "&:hover": {
    transform: disabled ? "none" : "scale(1.05)",
    backgroundColor: disabled ? "#f2f2f2" : "#B4322A",
    color: "#fff",
    "& p": {
      color: disabled ? "#d3d3d3" : "#fff",
    },
    "& svg": {
      fill: disabled ? "#d3d3d3" : "#fff",
    },
    "& .tooltip": {
      visibility: "visible",
      opacity: 1,
    },
  },
}));

// Tooltip styling for disabled buttons - updated to show on button hover
export const Tooltip = styled("div")({
  visibility: "hidden",
  opacity: 0,
  position: "absolute",
  bottom: "100%", // Position above the button
  left: "50%",
  transform: "translateX(-50%)",
  backgroundColor: "rgba(0, 0, 0, 0.85)",
  color: "#fff",
  padding: "4px 8px",
  fontSize: "0.60rem",
  borderRadius: "4px",
  whiteSpace: "nowrap",
  zIndex: 10,
  boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)",
  fontWeight: "bold",
  marginBottom: "8px", // Add some space between tooltip and button
  transition: "visibility 0s, opacity 0.3s ease", // Smooth transition

  "&::after": {
    content: "''",
    position: "absolute",
    top: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    borderWidth: "5px",
    borderStyle: "solid",
    borderColor: "rgba(0, 0, 0, 0.85) transparent transparent transparent",
  },
});


// Removed DisabledOverlay component since we're not using it anymore