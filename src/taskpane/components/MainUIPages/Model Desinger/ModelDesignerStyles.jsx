import { styled } from "@mui/system";

// 1) Outer container
export const Container = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  fontFamily: "Roboto, sans-serif",
  width: "100%",
  height: "100vh",
  overflowY: "auto",
  overflowX: "hidden",
  scrollbarWidth: "none",
  msOverflowStyle: "none",
  "&::-webkit-scrollbar": {
    display: "none",
  },
});

// 2) Header: Back button + title
export const WelcomeContainer = styled("div")({
  display: "flex",
  alignItems: "center",
  gap: "16px",
  margin: "16px 0",
  "& h1": {
    fontSize: "clamp(1.11rem, 2vw, 1.8rem)",
    color: "#B4322A",
    fontWeight: "bold",
    margin: 0,
  },
});

// 3) Back button icon styling
export const BackButtonIcon = styled("svg")({
  cursor: "pointer",
  color: "#707477",
  transition: "color 0.3s ease",
  "&:hover": {
    color: "#B4322A",
  },
});

// 4) Grid wrapper for tiles
export const ButtonsContainer = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "15px",
  justifyItems: "center",
  alignItems: "center",
  padding: "20px 0",
});

// 5) Tile-style button
export const Button = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  width: "85px",
  height: "85px",
  backgroundColor: "#f5f5f5",
  borderRadius: "8px",
  cursor: "pointer",
  color: "#6D6E71",
  transition:
    "transform 0.2s ease-in-out, background-color 0.2s ease-in-out, color 0.2s ease-in-out",
  "&:hover": {
    transform: "scale(1.05)",
    backgroundColor: "#e0e0e0",
    color: "#FFFFFF",
  },
  [`&:hover ${"img"}`]: {
    filter: "brightness(0) invert(1)",
  },
});

// 6) Icon inside button
export const Icon = styled("img")({
  width: "30px",
  height: "30px",
  filter: "grayscale(100%)",
  margin: "8px 0",
  transition: "filter 0.2s ease-in-out",
});

// 7) Label under icon
export const Label = styled("span")({
  fontSize: "10px",
  fontWeight: "normal",
  color: "inherit",
  textAlign: "center",
  fontFamily: "Roboto, sans-serif",
  transition: "color 0.2s ease-in-out",
});
