// ResetPasswordStyles.js
import { styled } from "@mui/system";

export const PageContainer = styled("div")({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  alignItems: "center",
  minHeight: "100vh",
  width: "100%",
  padding: "1rem",
  backgroundColor: "#fff",
  boxSizing: "border-box",
  overflow: "hidden",
  "@media (max-width: 480px)": { padding: "0.5rem" },
});

export const LogoContainer = styled("div")({
  marginBottom: "1rem",
  "& img": { width: "100%", maxWidth: "150px", height: "auto" },
});

export const TitleContainer = styled("div")({
  display: "flex",
  alignItems: "center",
  width: "90%",
  maxWidth: "400px",
  margin: "0 auto",
  marginBottom: "0.5rem",
});

export const BackButtonContainer = styled("div")({
  flexShrink: 0,
  "& button": {
    background: "none",
    border: "none",
    fontSize: "1.5rem",
    cursor: "pointer",
    color: "#7d7d7d",
    "&:hover": { color: "#b71c1c" },
  },
});

export const HeadingText = styled("h1")({
  color: "#b71c1c",
  fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
  fontWeight: "bold",
  margin: 0,
  marginLeft: "0.5rem",
});

export const DescriptionText = styled("p")({
  color: "#7d7d7d",
  fontSize: "clamp(1rem, 1.5vw, 1.2rem)",
  fontWeight: 400,
  margin: 0,
  marginBottom: "1rem",
  textAlign: "center",
});

export const FormContainer = styled("form")({
  width: "90%",
  maxWidth: "400px",
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
});

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

export const ErrorText = styled("div")({
  color: "red",
  fontSize: "0.875rem",
  marginTop: "-0.5rem",
  marginBottom: "0.5rem",
  alignSelf: "flex-start",
});

export const Button = styled("button")(({ primary }) => ({
  width: "100%",
  padding: "0.8rem",
  margin: "1rem 0",
  borderRadius: "0.5rem",
  backgroundColor: primary ? "#b71c1c" : "#f0f0f0",
  color: primary ? "#fff" : "#7d7d7d",
  border: "none",
  cursor: "pointer",
  fontSize: "1rem",
  fontWeight: "bold",
  "&:disabled": { opacity: 0.6, cursor: "not-allowed" },
  "&:hover:not(:disabled)": { opacity: 0.9 },
}));

export const FooterContainer = styled("div")({
  width: "100%",
  marginTop: "auto",
});

export const FooterTextContainer = styled("div")({
  textAlign: "center",
  fontSize: "0.8rem",
  color: "#ccc",
  padding: "0.5rem 0",
});

export const FooterImageContainer = styled("div")({
  width: "100%",
  "& img": {
    width: "100%",
    height: "auto",
    objectFit: "cover",
    transformOrigin: "center bottom",
  },
});
