import { styled } from "@mui/system";

export const FooterContainer = styled("footer")({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: "#f9f9f9",
  borderTop: "1px solid #ddd",
  padding: "0 1rem",
  height: "50px",
});

export const FooterLeft = styled("div")({
  color: "#939393",
  fontSize: "0.45rem",
});

export const FooterRight = styled("div")({
  display: "flex",
  gap: "1.5rem", // space between links
  "& a": {
    color: "#939393",
    textDecoration: "none",
    fontSize: "0.45rem",
  },
  "& a:hover": {
    textDecoration: "underline",
  },
});
