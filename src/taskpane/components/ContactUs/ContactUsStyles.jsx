import { styled } from "@mui/system";

// Main container for the page
export const PageContainer = styled("div")({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  alignItems: "center",
  minHeight: "100vh", // Ensures content fits dynamically
  width: "100%",
  backgroundColor: "#fff",
  boxSizing: "border-box",
  overflow: "hidden", // Prevent scrollbars
  padding: "1rem",

  "@media (max-width: 480px)": {
    padding: "0.5rem",
  },
});

// Logo container
export const LogoContainer = styled("div")({
  display: "flex",
  justifyContent: "center",
  marginBottom: "1rem",

  "& img": {
    width: "100%",
    maxWidth: "120px", // Smaller logo for smaller screens
    height: "auto",
  },
});

// Back button container
export const BackButtonContainer = styled("div")({
  alignSelf: "flex-start",
  marginBottom: "1rem",
  marginLeft: "10px",

  "& button": {
    background: "none",
    border: "none",
    fontSize: "1.5rem",
    cursor: "pointer",
    color: "#7d7d7d",

    "&:hover": {
      color: "#B4322A",
    },
  },
});

// Heading text
export const HeadingText = styled("h1")({
  fontSize: "clamp(1.2rem, 2.5vw, 1.8rem)", // Responsive font size
  fontWeight: "bold",
  textAlign: "center",
  color: "#B4322A", // Updated to red hex color
  marginBottom: "1rem",
});

// Form container
export const FormContainer = styled("form")({
  width: "90%",
  maxWidth: "400px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "1rem", // Add uniform gap between all form fields

  "& .name-fields": {
    display: "flex",
    width: "100%",
    gap: "1rem", // Uniform gap between first and last name fields

    "& > div": {
      flex: 1,
    },

    "@media (max-width: 480px)": {
      flexDirection: "column", // Stack fields on smaller screens
      gap: "1rem", // Maintain gap for stacked fields
    },
  },
});

// Input container
export const InputContainer = styled("div")({
  width: "100%",
});

// Input fields
export const InputField = styled("input")({
  width: "100%",
  padding: "0.6rem", // Reduced padding for smaller fields
  borderRadius: "0.4rem",
  border: "1px solid #ccc",
  fontSize: "0.9rem", // Smaller font size
  outline: "none",
  boxSizing: "border-box",

  "@media (max-width: 480px)": {
    padding: "0.5rem",
    fontSize: "0.8rem",
  },
});

// Text area field
export const TextAreaField = styled("textarea")({
  width: "100%",
  padding: "0.6rem", // Reduced padding
  borderRadius: "0.4rem",
  border: "1px solid #ccc",
  fontSize: "0.9rem",
  outline: "none",
  boxSizing: "border-box",
  resize: "none",
  height: "80px", // Reduced height

  "@media (max-width: 480px)": {
    padding: "0.5rem",
    fontSize: "0.8rem",
    height: "70px", // Adjusted height for smaller screens
  },
});

// Buttons
export const Button = styled("button")(({ primary }) => ({
  width: "100%",
  padding: "0.7rem",
  margin: "0.8rem 0",
  borderRadius: "0.5rem",
  backgroundColor: primary ? "#B4322A" : "#f0f0f0", // Updated to red hex color
  color: primary ? "#fff" : "#7d7d7d",
  border: "none",
  cursor: "pointer",
  fontSize: "0.9rem",
  fontWeight: "bold",
  textAlign: "center",

  "&:hover": {
    opacity: 0.9,
  },

  "@media (max-width: 480px)": {
    padding: "0.6rem",
    fontSize: "0.8rem",
  },
}));

// Footer container
export const FooterContainer = styled("div")({
  width: "100%",
  maxHeight: "20vh", // Maximum 20% of the viewport height
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  alignItems: "center",
  position: "relative",
  marginTop: "auto",
  boxSizing: "border-box",
});

// Footer text container
export const FooterTextContainer = styled("div")({
  width: "100%",
  textAlign: "center",
  fontSize: "0.8rem",
  color: "#ccc",
  padding: "0.5rem 0",

  "@media (max-height: 500px)": {
    fontSize: "0.7rem", // Adjust text size for smaller screens
    padding: "0.3rem 0",
  },
});

// Footer image container
export const FooterImageContainer = styled("div")({
  width: "100%",
  flexGrow: 1, // Ensures the image container takes up the remaining space in the footer
  display: "flex",
  alignItems: "flex-end", // Align the image at the bottom of the container
  position: "relative",
  overflow: "hidden", // Ensure the image doesn't overflow the container

  "& img": {
    width: "100%",
    height: "100%",
    objectFit: "cover", // Ensure the image fills the container while maintaining its aspect ratio
    transformOrigin: "center bottom", // Focus zoom on the bottom center
  },

  "@media (max-height: 500px)": {
    "& img": {
      transform: "scale(1.1)", // Slightly larger zoom for smaller screens
    },
  },
});
