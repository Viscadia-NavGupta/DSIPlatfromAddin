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
  fontSize: "20px",
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

/**
 * Custom dropdown wrapper to prevent viewport overflow.
 */
export const CustomDropdown = styled("div")({
  position: "relative",
  width: "100%",
  border: "1px solid #E0E0E0",
  borderRadius: "8px",
  backgroundColor: "#F7F7F7",
  cursor: "pointer",
});

/**
 * Dropdown button with an arrow
 */
export const DropdownButton = styled("div")({
  padding: "12px",
  fontSize: "14px",
  color: "#4F4F4F",
  backgroundColor: "#F7F7F7",
  borderRadius: "8px",
  border: "1px solid #E0E0E0",
  display: "flex",
  justifyContent: "space-between", // Pushes arrow to the right
  alignItems: "center",
  cursor: "pointer",
  position: "relative",
  "&:hover": {
    backgroundColor: "#E0E0E0",
  },
});

/**
 * Arrow container to ensure proper positioning
 */
export const DropdownArrow = styled("span")({
  marginLeft: "auto",
  paddingRight: "10px",
  color: "#A0A0A0", // Light gray arrow
  display: "flex",
  alignItems: "center",
});


/**
 * The dropdown options list (scrollable)
 */
export const DropdownList = styled("div")({
  position: "absolute",
  top: "100%",
  left: 0,
  width: "100%",
  maxHeight: "200px", // Limits height
  overflowY: "auto", // Enables scrolling
  border: "1px solid #E0E0E0",
  borderRadius: "8px",
  backgroundColor: "#FFF",
  zIndex: 1000, // Ensures it appears above other elements
  boxShadow: "0px 2px 10px rgba(0, 0, 0, 0.1)",
});

/**
 * Individual dropdown item styling
 */
export const DropdownItem = styled("div")({
  padding: "10px",
  fontSize: "14px",
  color: "#4F4F4F",
  cursor: "pointer",
  "&:hover": {
    backgroundColor: "#E0E0E0",
  },
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
