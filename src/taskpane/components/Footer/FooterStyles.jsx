import { styled } from "@mui/system";

export const FooterContainer = styled("footer")({
  gridArea: "footer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center", // Center content if text is breaking into multiple lines
  backgroundColor: "#f9f9f9", // Light background color
  borderTop: "1px solid #ddd",
  padding: "0 1rem", // Adjust padding to prevent overflow
  height: "auto", // Adjust height dynamically instead of fixed 50px

  "& p": {
    margin: "0.25rem 0", // Reduce margin
    fontSize: "0.65rem", // Slightly reduce font size for better fit
    color: "#939393",
    textAlign: "center", // Ensures text is properly aligned
    whiteSpace: "normal", // Allows text to wrap properly
  },

  "& a": {
    color: "#B4322A", // Updated red color
    textDecoration: "none",
    margin: "0 0.5rem", // Keep spacing balanced
    fontSize: "0.7rem", // Match font size with paragraph text
    wordBreak: "break-word", // Ensures links don’t overflow
  },

  "& img": {
    height: "20px", // Reduce icon size for better alignment
  },
});
