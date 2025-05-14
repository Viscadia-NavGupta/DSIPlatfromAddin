// PasswordResetSuccessStyles.js
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
  marginBottom: "2rem",
  "& img": { width: "100%", maxWidth: "150px", height: "auto" },
});

export const SuccessContainer = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "1.5rem",
});

export const SuccessText = styled("h2")({
  color: "#2e7d32",  // a pleasant green
  fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
  textAlign: "center",
  margin: 0,
});

export const Button = styled("button")(({ primary }) => ({
  padding: "0.8rem 1rem",
  borderRadius: "0.5rem",
  backgroundColor: primary ? "#b71c1c" : "#f0f0f0",
  color: primary ? "#fff" : "#7d7d7d",
  border: "none",
  cursor: "pointer",
  fontSize: "1rem",
  fontWeight: "bold",
  "&:hover": { opacity: 0.9 },
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
