import { styled } from "@mui/system";

export const Overlay = styled("div")({
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(255, 255, 255, 0.8)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000, // Ensures the overlay is on top of other elements
});

export const LoadingContainer = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
});

export const LoadingCircle = styled("div")({
  border: "16px solid #f3f3f3", // Light grey
  borderTop: "16px solid #3498db", // Blue
  borderRadius: "50%",
  width: "120px",
  height: "120px",
  animation: "spin 2s linear infinite",
  "@keyframes spin": {
    "0%": { transform: "rotate(0deg)" },
    "100%": { transform: "rotate(360deg)" },
  },
});

export const LoadingMessage = styled("p")({
  marginTop: "20px",
  fontSize: "1.2em",
  color: "#333",
});
