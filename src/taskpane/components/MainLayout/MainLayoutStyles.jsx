import { styled } from "@mui/system";

export const LayoutContainer = styled("div")({
  display: "grid",
  gridTemplateRows: "auto 1fr auto", // Keep footer flexible
  gridTemplateColumns: "minmax(60px, 8%) 1fr", // Keep the sidebar width constraint
  gridTemplateAreas: `
    "header header"
    "sidebar main"
    "sidebar footer"
  `,
  height: "100vh",
  width: "100vw",
  overflow: "hidden",
  boxSizing: "border-box",
});

export const SidebarContainer = styled("aside")({
  gridArea: "sidebar",
  backgroundColor: "#63676B",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "space-between",
  color: "#fff",
  width: "60px", 
  height: "100%",
  overflowY: "auto", // ✅ Allows scrolling inside sidebar
  overflowX: "visible", // ✅ Prevents tooltip from getting cut off
  padding: "10px 0",
  position: "relative", // ✅ Allows absolute positioning inside
  zIndex: 999, // ✅ Ensures sidebar is layered correctly
});
export const MainContentContainer = styled("main")({
  gridArea: "main",
  display: "flex",
  flexDirection: "column",
  alignItems: "center", // Centers content horizontally
  justifyContent: "flex-start", // Aligns content to the top
  backgroundColor: "#f9f9f9",
  flexGrow: 1, // Ensures it fills available space
  height: "100%", // Fills container height
  overflow: "hidden", // Prevents unnecessary scrollbars
  padding: "1rem", // Keeps spacing consistent
  boxSizing: "border-box",
});

export const FooterContainer = styled("footer")({
  gridArea: "footer",
  backgroundColor: "#fff",
  textAlign: "center",
  padding: "0.5rem",
  borderTop: "1px solid #ddd",
  minHeight: "50px",
});
