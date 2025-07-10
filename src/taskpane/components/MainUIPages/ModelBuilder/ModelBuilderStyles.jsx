import { styled } from "@mui/system";
import {
  Container as BaseContainer,
  Heading as BaseHeading,
} from "../SaveScenario/SaveForecastPageStyles";

// 1) Layout
export const Container = styled(BaseContainer)({});
export const ModelManagementTitle = styled(BaseHeading)({});

export const ButtonsContainer = styled("div")({
  display: "flex",
  gap: "20px",
  justifyContent: "center",
  alignItems: "center",
});

// 2) Icon wrapper — sizing & centering only
export const Icon = styled("div")({
  width: "30px",
  height: "30px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  "& svg": {
    width: "24px",
    height: "24px",
    fill: "currentColor !important",
    transition: "fill 0.2s ease-in-out",
  },
});

// 3) Label inherits the button’s color
const Label = styled("span")({
  fontFamily: "Roboto, sans-serif",
  fontWeight: 300,
  fontSize: "10px",
  lineHeight: "12px",
  textAlign: "center",
  color: "inherit",
  transition: "color 0.2s ease-in-out",
});
export const FreshLabel = styled(Label)({});
export const LoadLabel = styled(Label)({});

// 4) The “tile” button
export const Button = styled("button")({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  width: "85px",
  height: "85px",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",

  // idle state
  backgroundColor: "#E0E0E0",
  color: "#666666",  // drives icon & label color

  transition:
    "background-color 0.2s ease-in-out, color 0.2s ease-in-out",

  // hover state
  "&:hover": {
    backgroundColor: "#BD302B",
    color: "#FFFFFF", // icon & label → white
  },
});
