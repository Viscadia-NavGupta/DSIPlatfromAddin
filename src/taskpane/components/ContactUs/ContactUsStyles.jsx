// ContactUsStyles.js
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
  "@media (max-width: 480px)": {
    padding: "0.5rem",
  },
});

export const LogoContainer = styled("div")({
  display: "flex",
  justifyContent: "center",
  marginBottom: "1rem",
  "& img": {
    width: "100%",
    maxWidth: "120px",
    height: "auto",
  },
});

export const TitleContainer = styled("div")({
  display: "flex",
  alignItems: "center",
  width: "90%",
  maxWidth: "400px",
  margin: "0 auto 1rem",
});

export const BackButtonContainer = styled("div")({
  flexShrink: 0,
  "& button": {
    background: "none",
    border: "none",
    fontSize: "1.5rem",
    cursor: "pointer",
    color: "#7d7d7d",
    "&:hover": { color: "#B4322A" },
  },
});

export const HeadingText = styled("h1")({
  fontSize: "clamp(1.2rem, 2.5vw, 1.8rem)",
  fontWeight: "bold",
  color: "#B4322A",
  margin: 0,
  marginLeft: "0.5rem",
  flex: 1,
  textAlign: "center",
});

export const FormContainer = styled("form")({
  width: "90%",
  maxWidth: "400px",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  alignItems: "stretch",
  "& .name-fields": {
    display: "flex",
    width: "100%",
    gap: "1rem",
    "@media (max-width: 480px)": {
      flexDirection: "column",
    },
  },
});

export const InputContainer = styled("div")({
  width: "100%",
});

export const InputField = styled("input")({
  width: "100%",
  padding: "0.6rem",
  borderRadius: "0.4rem",
  border: "1px solid #ccc",
  fontSize: "clamp(0.9rem, 1.5vw, 1rem)",
  outline: "none",
  boxSizing: "border-box",
  "@media (max-width: 480px)": {
    padding: "0.5rem",
    fontSize: "0.8rem",
  },
});

export const TextAreaField = styled("textarea")({
  width: "100%",
  padding: "0.6rem",
  borderRadius: "0.4rem",
  border: "1px solid #ccc",
  fontSize: "clamp(0.9rem, 1.5vw, 1rem)",
  outline: "none",
  boxSizing: "border-box",
  resize: "none",
  height: "clamp(4rem, 8vw, 6rem)",
  "@media (max-width: 480px)": {
    padding: "0.5rem",
    fontSize: "0.8rem",
    height: "clamp(3rem, 10vw, 5rem)",
  },
});

export const Button = styled("button")(({ primary }) => ({
  width: "100%",
  padding: "clamp(0.6rem, 2vw, 0.8rem)",
  borderRadius: "0.5rem",
  backgroundColor: primary ? "#B4322A" : "#f0f0f0",
  color: primary ? "#fff" : "#7d7d7d",
  border: "none",
  cursor: "pointer",
  fontSize: "clamp(0.9rem, 1.5vw, 1rem)",
  fontWeight: "bold",
  textAlign: "center",
  "&:hover": { opacity: 0.9 },
  "@media (max-width: 480px)": {
    padding: "0.5rem",
    fontSize: "0.8rem",
  },
}));

export const FooterContainer = styled("div")({
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  marginTop: "auto",
  boxSizing: "border-box",
});

export const FooterTextContainer = styled("div")({
  width: "100%",
  textAlign: "center",
  fontSize: "clamp(0.7rem, 1.2vw, 0.8rem)",
  color: "#ccc",
  padding: "0.5rem 0",
  "@media (max-height: 500px)": {
    fontSize: "0.7rem",
    padding: "0.3rem 0",
  },
});

export const FooterImageContainer = styled("div")({
  width: "100%",
  flexGrow: 1,
  position: "relative",
  overflow: "hidden",
  "& img": {
    width: "100%",
    height: "auto",
    objectFit: "cover",
    transformOrigin: "center bottom",
  },
  "@media (max-height: 500px)": {
    "& img": {
      transform: "scale(1.1)",
    },
  },
});
