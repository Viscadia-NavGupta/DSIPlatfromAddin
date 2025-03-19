import { styled } from "@mui/system";

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
export const NameContainer = styled("div")({
  marginTop: "0.5rem",
});


export const WelcomeContainer = styled("div")({
  textAlign: "center",
  marginBottom: "5px",
  "& h1": {
    fontSize: "clamp(1.2rem, 2vw, 1.8rem)",
    color: "#B4322A",
    marginBottom: "0.3rem",
  },
  "& h2": {
    fontSize: "clamp(1rem, 1.5vw, 1.3rem)",
    color: "#B4322A",
    fontWeight: "bold",
    margin: 0,
  },
});

export const ButtonsContainer = styled("div")({
  display: "grid",
  gap: "8px",
  width: "100%",
  justifyItems: "center",
  padding: "5px",
  gridTemplateColumns: "repeat(auto-fit, minmax(95px, 1fr))",
  overflow: "visible",
});

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
  overflow: "hidden",
  padding: "3px",
  width: "100%",
  height: "75px",
  transition: "background-color 0.3s ease, color 0.3s ease",

  "& svg": {
    width: "35%",
    height: "35%",
    marginBottom: "0.2rem",
    fill: disabled ? "#d3d3d3" : "#63666A",
    transition: "fill 0.3s ease", // ✅ Smooth color transition
  },

  "& p": {
    fontSize: "clamp(0.6rem, 0.8vw, 0.9rem)",
    color: disabled ? "#d3d3d3" : "#63666A",
    margin: 0,
    textAlign: "center",
    wordBreak: "break-word",
    transition: "color 0.3s ease", // ✅ Smooth text color transition
  },

  "&:hover": {
    backgroundColor: disabled ? "#f2f2f2" : "#B4322A", // ✅ Changes background color for active buttons
    "& p": {
      color: disabled ? "#d3d3d3" : "#fff", // ✅ Text turns white on hover
    },
    "& svg": {
      fill: disabled ? "#d3d3d3" : "#fff", // ✅ Icon color changes on hover
    },
  },
}));


export const TooltipWrapper = styled("div")({
  position: "relative",
  display: "inline-block",
  "&:hover div": {
    display: "block", // ✅ Show tooltip on hover
  },
});

export const Tooltip = styled("div")({
  position: "absolute",
  top: "-30px", // Moves tooltip slightly closer to the button
  right: "-5px", // Adjust alignment
  backgroundColor: "#2c3e50", // Dark background
  color: "#fff",
  padding: "4px 8px", // Reduce padding for a smaller tooltip
  fontSize: "0.65rem", // 🔥 Smaller font size for better fit
  borderRadius: "4px", // Rounded corners
  whiteSpace: "nowrap", // Ensures text stays in one line
  boxShadow: "0px 3px 5px rgba(0, 0, 0, 0.2)", // Slight shadow for visibility
  zIndex: 10,
  display: "none", // Initially hidden

  "&::after": {
    content: '""',
    position: "absolute",
    bottom: "-5px", // Arrow positioning
    right: "10px",
    borderWidth: "5px",
    borderStyle: "solid",
    borderColor: "#2c3e50 transparent transparent transparent",
  },
});


