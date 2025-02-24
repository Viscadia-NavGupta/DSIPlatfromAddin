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
  marginTop: "10px", // Reduced gap
  marginBottom: "10px",

  "& img": {
    width: "100%",
    maxWidth: "150px",
    height: "auto",
  },
});

// Back button container
export const BackButtonContainer = styled("div")({
  display: "flex",
  justifyContent: "flex-start",
  width: "90%",
  marginTop: "0px",
  marginLeft: "2%",

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
  marginBottom: "1rem",
  textAlign: "center",
});

// Description text
export const DescriptionText = styled("p")({
  color: "#7d7d7d",
  fontSize: "clamp(1rem, 1.5vw, 1.2rem)",
  fontWeight: "400",
  marginBottom: "2rem",
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

// Input fields
export const InputField = styled("input")({
  width: "100%",
  padding: "0.8rem",
  margin: "0.8rem 0",
  borderRadius: "0.5rem",
  border: "1px solid #ccc",
  fontSize: "1rem",
  outline: "none",
  boxSizing: "border-box",
});

// Buttons
export const Button = styled("button")(({ primary }) => ({
  width: "100%",
  padding: "0.8rem",
  margin: "0.8rem 0",
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
    transform: "scale(1.2)", // Zoom into the image
    transformOrigin: "center bottom", // Focus zoom on the bottom center
  },

  "@media (max-width: 480px)": {
    "& img": {
      transform: "scale(1.3)", // Slightly larger zoom for smaller screens
    },
  },
});
