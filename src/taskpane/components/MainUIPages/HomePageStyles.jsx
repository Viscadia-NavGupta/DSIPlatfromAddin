import { styled } from "@mui/system";

// Main container fits within MainLayout's MainContentContainer
export const HomePageContainer = styled("div")({
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-start", // Centers content properly
  alignItems: "center",
  height: "100%", // Takes up full available space
  width: "100%", // Prevents overflow
  boxSizing: "border-box",
});

// Welcome container with greeting text
export const WelcomeContainer = styled("div")({
  textAlign: "center",
  marginBottom: "20px", // Reduced margin for better spacing
  "& h1": {
    fontSize: "1.8rem",
    color: "#B4322A",
    marginBottom: "0.5rem",
  },
  "& h2": {
    fontSize: "1.5rem",
    color: "#B4322A",
    fontWeight: "bold",
    margin: 0,
  },
});

// Container for the user's name
export const NameContainer = styled("div")({
  marginTop: "0.5rem",
});

// Buttons container for feature buttons
export const ButtonsContainer = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
  gap: "10px",
  width: "100%",
  justifyItems: "center",
});

// Individual button styles
export const Button = styled("button")(({ disabled }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "0.4rem",
  border: "1px solid #ddd",
  borderRadius: "10px",
  backgroundColor: disabled ? "#f2f2f2" : "#fff",
  width: "90px",
  height: "90px",
  cursor: disabled ? "not-allowed" : "pointer",
  textAlign: "center",
  position: "relative",
  transition: "transform 0.3s, background-color 0.3s, color 0.3s",
  "& svg": {
    width: "28px",
    height: "28px",
    marginBottom: "0.4rem",
    fill: disabled ? "#d3d3d3" : "#63666A",
  },
  "& p": {
    fontSize: "0.75rem",
    color: disabled ? "#d3d3d3" : "#63666A",
    margin: 0,
  },
  "&:hover": {
    transform: disabled ? "none" : "scale(1.05)",
    backgroundColor: disabled ? "#f2f2f2" : "#B4322A",
    color: disabled ? "#d3d3d3" : "#fff",
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

export const TooltipWrapper = styled("div")({
  position: "relative",
  display: "inline-block",
  "&:hover div": {
    display: "block", // Shows tooltip when hovering over the wrapper
  },
});


// Tooltip styling
export const Tooltip = styled("div")({
  display: "none",
  position: "absolute",
  bottom: "calc(0%)",
  left: "50%",
  transform: "translateX(-50%)",
  backgroundColor: "#B4322A",
  color: "#fff",
  padding: "8px",
  fontSize: "0.6rem",
  borderRadius: "4px",
  whiteSpace: "normal",
  maxWidth: "250px",
  textAlign: "center",
  zIndex: 10,
  boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
});
