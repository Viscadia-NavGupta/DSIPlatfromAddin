import { styled } from "@mui/system";

export const HeaderContainer = styled("header")({
  gridArea: "header", // Explicitly place it in the grid area defined in MainLayout
  display: "flex",
  alignItems: "center",
  backgroundColor: "#fff",
  borderBottom: "1px solid #ddd",
  height: "100%",
  boxSizing: "border-box",
});

export const LogoContainer = styled("div")({
  flex: "0 0 15%", // Logo container takes 15% width
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  "& img": {
    width: "70%", // Logo takes 70% of the container's width
    height: "auto",
  },
});

export const HeadingContainer = styled("div")({
  flex: "1", // Remaining space for the heading
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  paddingLeft: "1rem",
  "& h1": {
    fontSize: "1rem",
    color: "#4f4f4f",
    fontWeight: "bold",
    margin: 0,
    // whiteSpace: "nowrap", // Prevent wrapping
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
});
