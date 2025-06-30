// saveforecastpagestyles.js
import { styled } from "@mui/system";

export const Container = styled("div")({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
});

export const MessageBox = styled("div")({
  fontFamily: "Roboto",
  fontStyle: "normal",
  fontWeight: 400,
  fontSize: "14px",
  color: "#6E6E6E",           // explicitly gray
  // padding: "20px",
  borderRadius: "8px",
  textAlign: "center",
  // marginTop: "20px",
  width: "100%",
  whiteSpace: "pre-wrap",     // respect newlines
  wordBreak: "break-word",
});

export const SaveButton = styled("button")({
  padding: "10px 20px",
  marginTop: "20px",
  fontFamily: "Roboto",
  fontStyle: "normal",
  fontWeight: 400,
  fontSize: "12px",
  color: "#FFFFFF",
  backgroundColor: "#BD302B",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  "&:hover": {
    backgroundColor: "#8A1F1A",
  },
});
