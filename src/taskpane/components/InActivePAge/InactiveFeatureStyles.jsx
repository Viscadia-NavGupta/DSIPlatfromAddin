import { styled } from "@mui/system";

export const Card = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  borderRadius: "8px",
  backgroundColor: "#fff",
  textAlign: "center",
  width: "100%", // Ensures the card adapts to the container width
  boxSizing: "border-box", // Prevents overflow due to padding
});

export const Message = styled("div")({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#B4322A", // Red color for the message
  fontSize: "1rem",
  fontWeight: "bold",
  marginBottom: "10px",

  "& span": {
    fontSize: "1.2rem",
    marginRight: "5px",
  },
});

export const Button = styled("button")({
  backgroundColor: "#B4322A", // Red color for the button
  color: "#fff",
  padding: "10px 20px",
  fontSize: "1rem",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  marginTop: "20px",
  width: "100%", // Ensures the button spans the width of the card
  maxWidth: "200px", // Limits button width to prevent it from becoming too large
  transition: "background-color 0.3s",

  "&:hover": {
    backgroundColor: "#99271D", // Darker red on hover
  },
});
