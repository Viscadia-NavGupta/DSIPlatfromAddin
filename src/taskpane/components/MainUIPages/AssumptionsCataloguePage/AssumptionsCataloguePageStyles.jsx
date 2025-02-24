import { styled } from "@mui/system";

export const PageContainer = styled("div")({
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-start",
  alignItems: "center",
  height: "100%",
//   padding: "1rem",
  boxSizing: "border-box",
});

export const HeaderContainer = styled("div")({
  display: "flex",
  alignItems: "center",
  width: "100%",
  marginBottom: "1rem",
});

export const BackButton = styled("button")({
  background: "none",
  border: "none",
  color: "#b71c1c",
  fontSize: "1.2rem",
  cursor: "pointer",
  marginRight: "0.5rem",
});

export const Title = styled("h1")({
  fontSize: "1.5rem",
  color: "#333",
  fontWeight: "bold",
  margin: 0,
});

export const DropdownContainer = styled("div")({
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  width: "100%",
  maxWidth: "400px",
});

export const Dropdown = styled("select")({
  width: "100%",
  padding: "0.8rem",
  border: "1px solid #ddd",
  borderRadius: "5px",
  fontSize: "1rem",
  color: "#333",
  backgroundColor: "#fff",
  cursor: "pointer",
});

export const ImportButton = styled("button")({
  marginTop: "2rem",
  padding: "0.8rem 2rem",
  fontSize: "1rem",
  color: "#fff",
  backgroundColor: "#b71c1c",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
  transition: "background-color 0.3s",

  "&:hover": {
    backgroundColor: "#9a1919",
  },
});
