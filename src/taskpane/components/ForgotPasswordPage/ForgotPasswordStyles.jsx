// ForgotPasswordStyles.js
import { styled } from "@mui/system";

// Main container for the page
export const PageContainer = styled("div")({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  alignItems: "center",
  height: "100vh", // Full viewport height
  width: "100%",
  backgroundColor: "#fff",
  boxSizing: "border-box",
  overflow: "hidden", // Prevent scrollbars
});

// Logo container
export const LogoContainer = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  marginTop: "10px",
  marginBottom: "10px",

  "& img": {
    width: "100%",
    maxWidth: "150px",
    height: "auto",
  },
});

// Title container (back button + heading)
export const TitleContainer = styled("div")({
  display: "flex",
  alignItems: "center",
  width: "90%",
  margin: "0 auto",
  marginBottom: "0.5rem",
});

// Back button container
export const BackButtonContainer = styled("div")({
  flexShrink: 0,
  "& button": {
    background: "none",
    border: "none",
    fontSize: "1.5rem",
    cursor: "pointer",
    color: "#7d7d7d",
    "&:hover": {
      color: "#b71c1c",
    },
  },
});

// Heading text
export const HeadingText = styled("h1")({
  color: "#b71c1c",
  fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
  fontWeight: "bold",
  margin: 0,
  marginLeft: "0.5rem",
});

// Description text
export const DescriptionText = styled("p")({
  color: "#7d7d7d",
  fontSize: "clamp(1rem, 1.5vw, 1.2rem)",
  fontWeight: "400",
  margin: 0,
  marginBottom: "1rem",
  textAlign: "center",
});

// Form container
export const FormContainer = styled("form")({
  width: "90%",
  maxWidth: "400px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
});

// Input field
export const InputField = styled("input")({
  width: "100%",
  padding: "0.8rem",
  margin: "0.5rem 0",
  borderRadius: "0.5rem",
  border: "1px solid #ccc",
  fontSize: "1rem",
  outline: "none",
  boxSizing: "border-box",
});

// Button
export const Button = styled("button")(({ primary }) => ({
  width: "100%",
  padding: "0.8rem",
  margin: "0.5rem 0",
  borderRadius: "0.5rem",
  backgroundColor: primary ? "#b71c1c" : "#f0f0f0",
  color: primary ? "#fff" : "#7d7d7d",
  border: "none",
  cursor: "pointer",
  fontSize: "1rem",
  fontWeight: "bold",
  textAlign: "center",
  "&:hover": {
    opacity: 0.9,
  },
}));

// Footer container
export const FooterContainer = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-end",
  width: "100%",
  position: "relative",
  flexShrink: 0,
});

// Footer text container
export const FooterTextContainer = styled("div")({
  zIndex: 1,
  textAlign: "center",
  fontSize: "0.8rem",
  color: "#ccc",
  paddingBottom: "10px",

  "@media (max-width: 480px)": {
    fontSize: "0.7rem",
    paddingBottom: "5px",
  },
});

// Footer image container
export const FooterImageContainer = styled("div")({
  width: "100%",
  position: "relative",

  "& img": {
    width: "100%",
    height: "auto",
    objectFit: "cover",
    transform: "scale(1.2)",        // Zoom into the image
    transformOrigin: "center bottom",
  },

  "@media (max-width: 480px)": {
    "& img": {
      transform: "scale(1.3)",
    },
  },
});
