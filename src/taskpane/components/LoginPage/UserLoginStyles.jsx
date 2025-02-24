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
  marginTop: "20px", // Reduced gap
  marginBottom: "10px",

  "& img": {
    width: "100%",
    maxWidth: "150px",
    height: "auto",
  },

  "@media (max-width: 480px)": {
    marginTop: "5px",
    marginBottom: "5px",
  },
});

// Welcome text container
export const WelcomeText = styled("div")({
  textAlign: "center",
  marginBottom: "10px",

  "& h1": {
    color: "#B4322A",
    fontSize: "clamp(1.5rem, 2.5vw, 2rem)", // Responsive font size
    fontWeight: "bold",
    margin: "5px 0",
  },

  "& p": {
    color: "#7d7d7d",
    fontSize: "1rem",
    fontWeight: "400",
    margin: "5px 0",
  },

  "@media (max-width: 480px)": {
    marginBottom: "5px",
  },
});

// Form container
export const FormContainer = styled("form")({
  width: "90%",
  maxWidth: "400px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  marginTop: "5px",

  "@media (max-width: 480px)": {
    marginTop: "2px",
  },
});

// Input fields
export const InputField = styled("input")({
  width: "100%",
  padding: "0.8rem",
  margin: "0.5rem 0",
  borderRadius: "0.5rem",
  border: "1px solid #ccc",
  fontSize: "1rem",
  outline: "none",
  boxSizing: "border-box",

  "@media (max-width: 480px)": {
    padding: "0.6rem",
  },
});

// Checkbox and forgot password link
export const CheckboxContainer = styled("div")({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  fontSize: "clamp(0.8rem, 1.2vw, 1rem)",

  "& label": {
    display: "flex",
    alignItems: "center",

    "& input": {
      marginRight: "0.5rem",
    },

    "& span": {
      fontSize: "clamp(0.8rem, 1.2vw, 1rem)",
      fontWeight: "400",
    },
  },

  "& a": {
    color: "#B4322A",
    textDecoration: "none",
    fontWeight: "500",
    fontSize: "clamp(0.8rem, 1.2vw, 1rem)",
  },
});

// Buttons
export const Button = styled("button")(({ primary }) => ({
  width: "100%",
  padding: "0.8rem",
  margin: "0.5rem 0",
  borderRadius: "0.5rem",
  backgroundColor: primary ? "#B4322A" : "#f0f0f0",
  color: primary ? "#fff" : "#7d7d7d",
  border: "none",
  cursor: "pointer",
  fontSize: "1rem",
  fontWeight: "bold",
  boxSizing: "border-box",
  textAlign: "center",

  "&:hover": {
    opacity: 0.9,
  },

  "@media (max-width: 480px)": {
    padding: "0.6rem",
  },
}));

// Footer container
export const FooterContainer = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "space-between", // Space between text and image
  width: "100%",
  maxHeight: "20vh", // Limit footer to 20% of the viewport height
  flexShrink: 0,
  position: "relative",
  boxSizing: "border-box",
});

// Footer text container
export const FooterTextContainer = styled("div")({
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
  flexGrow: 1, // Let the image container take up the remaining space in the footer
  overflow: "hidden",

  "& img": {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
});
