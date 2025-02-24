import { styled } from "@mui/system";

export const Container = styled("div")({
  position: "relative",
  // background: "#FFFFFF",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
});

export const Heading = styled("h2")({
  fontFamily: "Roboto",
  fontStyle: "normal",
  backgroundColor: "#00a19B",
  color: "#fff",
  border: "none",
  borderRadius: "20px",
  padding: "10px 40px",
  fontSize: "16px",
  fontWeight: "bold",
  textAlign: "center",
});

export const MessageBox = styled("div")({
  fontFamily: "Roboto",
  fontStyle: "normal",
  fontWeight: 400,
  fontSize: "14px",
  color: "#BD302B",
  padding: "20px",
  borderRadius: "8px",
  // backgroundColor: "#BD302B",
  textAlign: "center",
  marginTop: "20px",
  width: "100%",
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
    backgroundColor: "#005f99",
  },
});
