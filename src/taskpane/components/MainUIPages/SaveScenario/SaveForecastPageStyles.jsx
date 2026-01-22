import { styled } from "@mui/system";

export const Container = styled("div")({
  position: "relative",
  width: "100%",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  fontFamily: "Roboto, sans-serif",
  fontWeight: 300,
  boxSizing: "border-box",
});

export const Heading = styled("h2")({
  fontFamily: "Roboto, sans-serif",
  fontWeight: 400,
  color: "#63676B",
  fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
  margin: "0 0 1.25rem 0",
  textAlign: "center",
  "@media (max-width: 600px)": {
    fontSize: "1rem",
    margin: "0 0 1rem 0",
  },
});

export const MessageBox = styled("div")({
  fontFamily: "Roboto, sans-serif",
  fontWeight: 400,
  fontSize: "clamp(0.813rem, 2vw, 0.875rem)",
  color: "#FF0000",
  padding: "1.25rem",
  borderRadius: "0.5rem",
  backgroundColor: "#FFE0E0",
  textAlign: "center",
  marginTop: "1.25rem",
  width: "90%",
  maxWidth: "25rem",
});

export const DropdownContainer = styled("div")({
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "clamp(0.75rem, 2vw, 0.938rem)",
  maxWidth: "25rem",
});

export const SelectDropdown = styled("select")({
  width: "100%",
  padding: "clamp(0.625rem, 2vw, 0.75rem)",
  fontFamily: "Roboto, sans-serif",
  fontWeight: 400,
  fontSize: "clamp(0.813rem, 2vw, 0.875rem)",
  lineHeight: "160%",
  color: "#4F4F4F",
  border: "1px solid #E0E0E0",
  borderRadius: "0.5rem",
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
  padding: "clamp(0.625rem, 2vw, 0.75rem)",
  fontFamily: "Roboto, sans-serif",
  fontWeight: 400,
  fontSize: "clamp(0.813rem, 2vw, 0.875rem)",
  lineHeight: "160%",
  color: "#4F4F4F",
  border: "1px solid #E0E0E0",
  borderRadius: "0.5rem",
  boxSizing: "border-box",
  backgroundColor: "#F7F7F7",
});

export const SaveButton = styled("button")({
  padding: "clamp(0.75rem, 2vw, 0.875rem) clamp(1.25rem, 3vw, 1.5rem)",
  marginTop: "1.25rem",
  width: "100%",
  maxWidth: "25rem",
  fontFamily: "Roboto, sans-serif",
  fontWeight: 500,
  fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
  color: "#FFFFFF",
  backgroundColor: "#BD302B",
  borderRadius: "0.5rem",
  border: "none",
  cursor: "pointer",
  transition: "background 0.2s ease-in-out",
  "&:hover": {
    backgroundColor: "#8A1F1A",
  },
  "&:active": {
    transform: "scale(0.98)",
  },
});

export const SectionLabel = styled("label")({
  fontFamily: "Roboto, sans-serif",
  fontWeight: 500,
  fontSize: "clamp(0.813rem, 2vw, 0.875rem)",
  color: "#63676B",
  marginBottom: "0.5rem",
  display: "block",
});

export const TextArea = styled("textarea")({
  width: "100%",
  minHeight: "clamp(6rem, 15vh, 7.5rem)",
  padding: "clamp(0.625rem, 2vw, 0.75rem)",
  fontFamily: "Roboto, sans-serif",
  fontWeight: 400,
  fontSize: "clamp(0.813rem, 2vw, 0.875rem)",
  lineHeight: "160%",
  color: "#4F4F4F",
  border: "1px solid #E0E0E0",
  borderRadius: "0.5rem",
  boxSizing: "border-box",
  backgroundColor: "#F7F7F7",
  resize: "vertical",
  "&:focus": {
    outline: "none",
    borderColor: "#B4322A",
  },
  "&::placeholder": {
    color: "#999",
  },
});

export const CharacterCount = styled("div")(({ isNearLimit }) => ({
  fontFamily: "Roboto, sans-serif",
  fontWeight: 400,
  fontSize: "clamp(0.688rem, 1.8vw, 0.75rem)",
  color: isNearLimit ? "#BD302B" : "#999",
  textAlign: "right",
  marginTop: "0.25rem",
}));

export const DetailedNotesButton = styled("button")({
  padding: "clamp(0.625rem, 2vw, 0.75rem) clamp(1.25rem, 3vw, 1.5rem)",
  marginTop: "1.25rem",
  width: "100%",
  maxWidth: "25rem",
  fontFamily: "Roboto, sans-serif",
  fontWeight: 500,
  fontSize: "clamp(0.813rem, 2vw, 0.875rem)",
  color: "#63676B",
  backgroundColor: "#E0E0E0",
  borderRadius: "0.5rem",
  border: "Red",
  cursor: "pointer",
  transition: "background 0.2s ease-in-out",
  "&:hover": {
    backgroundColor: "#D0D0D0",
  },
  "&:active": {
    transform: "scale(0.98)",
  },
});

export const DetailedNotesContainer = styled("div")({
  width: "100%",
  maxWidth: "25rem",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  maxHeight: "calc(100vh - 280px)",
  overflowY: "auto",
  overflowX: "hidden",
  paddingRight: "0.5rem",
  paddingBottom: "0.5rem",
  "&::-webkit-scrollbar": {
    width: "6px",
  },
  "&::-webkit-scrollbar-track": {
    background: "#F7F7F7",
    borderRadius: "3px",
  },
  "&::-webkit-scrollbar-thumb": {
    background: "#E0E0E0",
    borderRadius: "3px",
  },
  "&::-webkit-scrollbar-thumb:hover": {
    background: "#B4322A",
  },
});

export const DetailedNoteField = styled("div")({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  flexShrink: 0,
});

export const DetailedNoteLabel = styled("label")({
  fontFamily: "Roboto, sans-serif",
  fontWeight: 500,
  fontSize: "clamp(0.813rem, 2vw, 0.875rem)",
  color: "#63676B",
  marginBottom: "0.5rem",
});

export const DetailedTextArea = styled("textarea")({
  width: "100%",
  minHeight: "60px",
  maxHeight: "150px",
  padding: "10px 12px",
  fontFamily: "Roboto, sans-serif",
  fontWeight: 400,
  fontSize: "14px",
  lineHeight: "160%",
  color: "#4F4F4F",
  border: "1px solid #E0E0E0",
  borderRadius: "8px",
  boxSizing: "border-box",
  backgroundColor: "#F7F7F7",
  resize: "vertical",
  "&:focus": {
    outline: "none",
    borderColor: "#B4322A",
  },
  "&::placeholder": {
    color: "#999",
  },
});

export const BackButton = styled("button")({
  width: "clamp(1.75rem, 5vw, 2rem)",
  height: "clamp(1.75rem, 5vw, 2rem)",
  padding: "0",
  fontFamily: "Roboto, sans-serif",
  fontWeight: 400,
  fontSize: "clamp(1rem, 3vw, 1.25rem)",
  color: "#63676B",
  backgroundColor: "transparent",
  border: "none",
  borderRadius: "0.25rem",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease-in-out",
  flexShrink: 0,
  "&:hover": {
    backgroundColor: "#F7F7F7",
    color: "#B4322A",
  },
  "&:active": {
    transform: "scale(0.95)",
  },
});

export const CheckboxContainer = styled("div")({
  display: "flex",
  alignItems: "center",
  alignSelf: "flex-start",
  margin: "0.5rem 0",
  width: "100%",
  maxWidth: "25rem",
});

export const Checkbox = styled("input")({
  width: "clamp(1rem, 2.5vw, 1.125rem)",
  height: "clamp(1rem, 2.5vw, 1.125rem)",
  cursor: "pointer",
});

export const CheckboxLabel = styled("label")({
  marginLeft: "0.5rem",
  fontSize: "clamp(0.813rem, 2vw, 0.875rem)",
  cursor: "pointer",
  fontFamily: "Roboto, sans-serif",
  color: "#4F4F4F",
});

export const NotesWrapper = styled("div")({
  width: "100%",
  maxWidth: "25rem",
  marginTop: "1rem",
});

export const BackButtonContainer = styled("div")({
  display: "flex",
  alignItems: "center",
  width: "100%",
  maxWidth: "25rem",
  marginBottom: "clamp(0.5rem, 2vw, 0.625rem)",
});

export const DetailedHeading = styled(Heading)({
  margin: 0,
  marginLeft: "0.5rem",
  fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
  flexGrow: 1,
});

// Modal Components
export const Overlay = styled("div")({
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
});

export const Modal = styled("div")({
  backgroundColor: "#FFFFFF",
  borderRadius: "0.5rem",
  padding: "1.5rem",
  maxWidth: "90%",
  width: "25rem",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
});

export const ModalHeader = styled("h3")({
  fontFamily: "Roboto, sans-serif",
  fontWeight: 500,
  fontSize: "clamp(1rem, 2.5vw, 1.125rem)",
  color: "#63676B",
  margin: 0,
});

export const ModalBody = styled("p")({
  fontFamily: "Roboto, sans-serif",
  fontWeight: 400,
  fontSize: "clamp(0.813rem, 2vw, 0.875rem)",
  color: "#4F4F4F",
  margin: 0,
  lineHeight: "160%",
});

export const ModalFooter = styled("div")({
  display: "flex",
  gap: "0.75rem",
  justifyContent: "flex-end",
  marginTop: "0.5rem",
});

export const ConfirmButton = styled("button")({
  padding: "0.625rem 1.25rem",
  fontFamily: "Roboto, sans-serif",
  fontWeight: 500,
  fontSize: "clamp(0.813rem, 2vw, 0.875rem)",
  color: "#FFFFFF",
  backgroundColor: "#BD302B",
  borderRadius: "0.5rem",
  border: "none",
  cursor: "pointer",
  transition: "background 0.2s ease-in-out",
  "&:hover": {
    backgroundColor: "#8A1F1A",
  },
  "&:active": {
    transform: "scale(0.98)",
  },
});
