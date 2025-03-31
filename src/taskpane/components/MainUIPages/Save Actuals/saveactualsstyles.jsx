import { styled } from "@mui/system";

export const Container = styled("div")({
  position: "relative",
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "Roboto, sans-serif",
  fontWeight: 300,
});

export const Heading = styled("h2")({
  fontFamily: "Roboto, sans-serif",
  fontWeight: 400,
  color: "#63676B",
  fontSize: "1.25rem",
  margin: "0 0 20px 0",
  textAlign: "center",
});

export const MessageBox = styled("div")({
  fontFamily: "Roboto, sans-serif",
  fontWeight: 400,
  fontSize: "14px",
  color: "#FF0000",
  padding: "20px",
  borderRadius: "8px",
  backgroundColor: "#FFE0E0",
  textAlign: "center",
  marginTop: "20px",
  width: "90%",
});

export const DropdownContainer = styled("div")({
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "15px",
  maxWidth: "400px",
});

export const SelectDropdown = styled("select")({
  width: "100%",
  padding: "12px",
  fontFamily: "Roboto, sans-serif",
  fontWeight: 400,
  fontSize: "14px",
  lineHeight: "160%",
  color: "#4F4F4F",
  border: "1px solid #E0E0E0",
  borderRadius: "8px",
  boxSizing: "border-box",
  backgroundColor: "#F7F7F7",
  cursor: "pointer",
  "&:focus": {
    outline: "none",
    borderColor: "#B4322A",
  },
});

export const Input = styled("input")({
  width: "100%",
  padding: "12px",
  fontFamily: "Roboto, sans-serif",
  fontWeight: 400,
  fontSize: "14px",
  lineHeight: "160%",
  color: "#4F4F4F",
  border: "1px solid #E0E0E0",
  borderRadius: "8px",
  boxSizing: "border-box",
  backgroundColor: "#F7F7F7",
});

export const SaveButton = styled("button")({
  padding: "14px 24px",
  marginTop: "30px",
  width: "100%",
  maxWidth: "400px",
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
