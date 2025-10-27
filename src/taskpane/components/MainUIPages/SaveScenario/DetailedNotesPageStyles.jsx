import { styled } from "@mui/system";

export const Container = styled("div")({
  position: "relative",
  width: "100%",
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  fontFamily: "Roboto, sans-serif",
  fontWeight: 300,
  overflowY: "auto",
  padding: "0",
  boxSizing: "border-box",
});

export const Header = styled("div")({
  display: "flex",
  alignItems: "flex-start",
  padding: "10px 0px",
  borderBottom: "1px solid #E0E0E0",
  backgroundColor: "#F7F7F7",
  position: "relative",
});

export const BackButton = styled("button")({
  position: "absolute",
  left: "0px",
  top: "0px",
  background: "none",
  border: "none",
  fontSize: "20px",
  color: "#4F4F4F",
  cursor: "pointer",
  padding: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "40px",
  height: "40px",
  borderRadius: "0",
  transition: "background-color 0.2s ease-in-out",
  "&:hover": {
    backgroundColor: "#E0E0E0",
  },
});

export const HeaderTitle = styled("h2")({
  fontFamily: "Roboto, sans-serif",
  fontWeight: 400,
  color: "#63676B",
  fontSize: "1.1rem",
  margin: "0",
  marginTop: "5px",
  textAlign: "center",
  width: "100%",
  lineHeight: "1.3",
});

export const NotesSection = styled("div")({
  display: "flex",
  flexDirection: "column",
  padding: "8px 0px",
  gap: "6px",
});

export const NotesLabel = styled("label")({
  fontFamily: "Roboto, sans-serif",
  fontWeight: 400,
  fontSize: "14px",
  color: "#4F4F4F",
  marginBottom: "5px",
});

export const NotesTextArea = styled("textarea")({
  width: "100%",
  minHeight: "70px",
  padding: "8px",
  fontFamily: "Roboto, sans-serif",
  fontWeight: 400,
  fontSize: "14px",
  lineHeight: "160%",
  color: "#4F4F4F",
  border: "1px solid #E0E0E0",
  borderRadius: "6px",
  boxSizing: "border-box",
  backgroundColor: "#F7F7F7",
  resize: "vertical",
  "&:focus": {
    outline: "none",
    borderColor: "#B4322A",
  },
});

export const SaveButton = styled("button")({
  margin: "0px",
  padding: "14px 24px",
  width: "100%",
  fontFamily: "Roboto, sans-serif",
  fontWeight: 500,
  fontSize: "16px",
  color: "#FFFFFF",
  backgroundColor: "#BD302B",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  transition: "background 0.2s ease-in-out",
  "&:hover": {
    backgroundColor: "#8A1F1A",
  },
});