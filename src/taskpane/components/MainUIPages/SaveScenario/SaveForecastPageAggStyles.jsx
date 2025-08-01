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
  "&:disabled": {
    backgroundColor: "#ccc",
    cursor: "not-allowed",
  },
});

// Modal overlay to dim background
export const Overlay = styled("div")({
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(0, 0, 0, 0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
});

// Modal container
export const Modal = styled("div")({
  backgroundColor: "#FFFFFF",
  borderRadius: "8px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
  width: "90%",
  maxWidth: "400px",
  overflow: "hidden",
});

export const ModalHeader = styled("div")({
  padding: "16px 24px",
  fontSize: "1.125rem",
  fontWeight: 500,
  borderBottom: "1px solid #E0E0E0",
  color: "#333333",
});

export const ModalBody = styled("div")({
  padding: "20px 24px",
  fontSize: "14px",
  color: "#4F4F4F",
  lineHeight: 1.5,
});

export const ModalFooter = styled("div")({
  padding: "12px 24px",
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  borderTop: "1px solid #E0E0E0",
});

export const ConfirmButton = styled("button")({
  padding: "8px 16px",
  fontFamily: "Roboto, sans-serif",
  fontWeight: 500,
  fontSize: "14px",
  color: "#FFFFFF",
  backgroundColor: "#BD302B",
  borderRadius: "4px",
  border: "none",
  cursor: "pointer",
  transition: "background 0.2s ease-in-out",
  "&:hover": {
    backgroundColor: "#8A1F1A",
  },
});
