import { styled } from "@mui/system";

// Main container
export const PageContainer = styled("div")({
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-start",
  alignItems: "center",
  height: "100%",
  boxSizing: "border-box",
  padding: "2vh 2vw",
});

// Header section
export const HeaderContainer = styled("div")({
  display: "flex",
  alignItems: "center",
  width: "100%",
  marginBottom: "3vh",
});

// Back button
export const BackButton = styled("button")({
  backgroundColor: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: "clamp(1rem, 2vw, 1.5rem)",
  marginRight: "1vw",
  color: "#B4322A",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  "&:hover": {
    color: "#8a0f0f",
  },
});

// Page title
export const Title = styled("h1")({
  fontSize: "clamp(1.5rem, 2vw, 1.8rem)",
  color: "#B4322A",
  fontWeight: "bold",
  margin: 0,
  textAlign: "center",
});

// ✅ **Updated Grid Layout with Smaller Buttons**
export const ButtonsContainer = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "8px", // Reduced gap for better spacing
  width: "100%",
  justifyItems: "center",
  padding: "0 1rem",

  "@media (max-width: 500px)": {
    gridTemplateColumns: "repeat(2, minmax(70px, 1fr))", // Adjust for small screens
  },
});

// ✅ **Smaller Button Size**
export const Button = styled("button")(({ disabled }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "0.4rem",
  border: "1px solid #ddd",
  borderRadius: "10px",
  backgroundColor: disabled ? "#f2f2f2" : "#fff",
  width: "90px", // Smaller button width
  height: "90px", // Smaller button height
  cursor: disabled ? "not-allowed" : "pointer",
  textAlign: "center",
  position: "relative",
  transition: "transform 0.3s, background-color 0.3s, color 0.3s",
  "& svg": {
    width: "28px", // Reduced icon size
    height: "28px",
    marginBottom: "0.4rem",
    fill: disabled ? "#d3d3d3" : "#63666A", // Updated icon color
  },
  "& p": {
    fontSize: "0.75rem", // Reduced text size
    color: disabled ? "#d3d3d3" : "#63666A", // Updated text color
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

// Footer link styling
export const FooterLink = styled("a")({
  fontSize: "clamp(0.8rem, 1.5vw, 1rem)",
  color: "#007bff",
  textDecoration: "none",
  alignSelf: "flex-end",
  marginTop: "auto",
  "&:hover": {
    textDecoration: "underline",
  },
});
