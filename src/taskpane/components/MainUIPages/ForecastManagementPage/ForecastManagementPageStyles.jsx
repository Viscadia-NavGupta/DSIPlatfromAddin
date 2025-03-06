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
  width: `${size}px`,
  height: `${size}px`,
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
  borderRadius: "8px", // ✅ Slightly smaller corners
  backgroundColor: disabled ? "#f2f2f2" : "#fff",
  cursor: disabled ? "not-allowed" : "pointer",
  textAlign: "center",
  position: "relative",
  overflow: "hidden",
  padding: "3px",
  width: "100%", // ✅ Ensures buttons take full available space
  height: "75px", // 🔥 Reduced height
  "& svg": {
    width: "35%", // ✅ Keeps icon proportional
    height: "35%",
    marginBottom: "0.2rem",
    fill: disabled ? "#d3d3d3" : "#63666A",
  },
  "& p": {
    fontSize: "clamp(0.6rem, 0.8vw, 0.9rem)", // 🔥 Reduced text size
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
      color: "#fff",
    },
    "& svg": {
      fill: "#fff",
    },
  },
}));
// Disabled overlay with tooltip wrapper
export const DisabledOverlay = styled("div")({
  position: "absolute",
  top: "5px",
  right: "5px",
  backgroundColor: "transparent",
  color: "#B4322A",
  borderRadius: "50%",
  width: "18px",
  height: "18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: "bold",
  cursor: "default",
  "&:hover + div": {
    display: "block",
  },
});

export const Tooltip = styled("div")({
  display: "none",
  position: "absolute",
  bottom: "calc(0%)",
  left: "50%",
  transform: "translateX(-50%)",
  backgroundColor: "#B4322A",
  color: "#fff",
  padding: "4px",
  fontSize: "0.5rem",
  borderRadius: "4px",
  whiteSpace: "normal",
  maxWidth: "300px",
  textAlign: "center",
  zIndex: 10,
  boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
});
