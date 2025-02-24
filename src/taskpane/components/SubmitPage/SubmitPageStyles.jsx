import { styled } from "@mui/system";

// Main container for the page
export const PageContainer = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "2rem",
  minHeight: "100vh",
  width: "100%",
  backgroundColor: "#fff",
  boxSizing: "border-box",
  overflowY: "auto",

  "@media (max-width: 768px)": {
    padding: "1rem",
  },

  "@media (max-width: 480px)": {
    padding: "0.5rem",
  },
});

// Logo container
export const LogoContainer = styled("div")({
  display: "flex",
  justifyContent: "center",
  marginBottom: "2rem",

  "& img": {
    width: "100%",
    maxWidth: "150px",
    height: "auto",
  },
});

// Message container
export const MessageContainer = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  marginBottom: "2rem",
});

// Success icon
export const SuccessIcon = styled("div")({
  fontSize: "4rem",
  color: "#b71c1c",
  marginBottom: "1rem",
});

// Heading
export const Heading = styled("h1")({
  fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
  fontWeight: "bold",
  color: "#b71c1c",
  marginBottom: "0.5rem",
});

// Subheading
export const SubHeading = styled("p")({
  fontSize: "clamp(1rem, 1.5vw, 1.2rem)",
  color: "#7d7d7d",
  marginBottom: "2rem",
});

// Button
export const Button = styled("button")({
  padding: "0.8rem 2rem",
  backgroundColor: "#f0f0f0",
  color: "#7d7d7d",
  border: "1px solid #ccc",
  borderRadius: "0.5rem",
  fontSize: "1rem",
  cursor: "pointer",
  boxSizing: "border-box",

  "&:hover": {
    backgroundColor: "#e0e0e0",
  },
});

// Footer text
export const FooterText = styled("footer")({
  marginTop: "auto",
  fontSize: "0.7rem",
  color: "#ccc",
  textAlign: "center",
  lineHeight: "1.5",
});
