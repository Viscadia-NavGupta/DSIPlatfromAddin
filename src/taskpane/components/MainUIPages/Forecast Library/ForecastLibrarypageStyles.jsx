import { styled } from "@mui/system";

// ── PAGE LAYOUT ───────────────────────────────────────────────────────────────

export const NameContainer = styled("div")({
  marginTop: "0.5rem",
});

export const HomePageContainer = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  height: "100vh",
  width: "100%",
  boxSizing: "border-box",
  overflowY: "auto",
  overflowX: "hidden",
  paddingBottom: "10px",
});

export const ContentWrapper = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "100%",
  maxWidth: "100%",
  flexGrow: 1,
  overflowY: "auto",
  overflowX: "hidden",
});

export const WelcomeContainer = styled("div")({
  textAlign: "center",
  marginBottom: "10px",
  display: "flex",
  alignItems: "center",
  gap: "16px",
  "& h1": {
    fontSize: "clamp(1.11rem, 2vw, 1.8rem)",
    color: "#B4322A",
    fontWeight: "bold",
  },
});

export const BackButtonIcon = styled("svg")({
  cursor: "pointer",
  color: "#707477",
  transition: "color 0.3s ease",
  "&:hover": {
    color: "#B4322A",
  },
});

// ── BUTTON GRID ───────────────────────────────────────────────────────────────

export const ButtonsContainer = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "16px",
  width: "90%",
  justifyItems: "center",
  padding: "10px",
});

// ── PAGE BUTTON ───────────────────────────────────────────────────────────────

export const Button = styled("button")(({ disabled }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #ddd",
  borderRadius: "8px",
  backgroundColor: disabled ? "#f2f2f2" : "#fff",
  cursor: disabled ? "not-allowed" : "pointer",
  textAlign: "center",
  position: "relative",
  overflow: "visible",
  padding: "3px",
  width: "100%",
  height: "75px",
  "& svg": {
    width: "35%",
    height: "35%",
    marginBottom: "0.2rem",
    fill: disabled ? "#d3d3d3" : "#63666A",
  },
  "& p": {
    fontSize: "clamp(0.6rem, 0.8vw, 0.9rem)",
    color: disabled ? "#d3d3d3" : "#63666A",
    margin: 0,
    textAlign: "center",
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflow: "hidden",
    maxWidth: "90%",
  },
  "&:hover": {
    transform: disabled ? "none" : "scale(1.05)",
    backgroundColor: disabled ? "#f2f2f2" : "#B4322A",
    color: "#fff",
    "& p": {
      color: disabled ? "#d3d3d3" : "#fff",
    },
    "& svg": {
      fill: disabled ? "#d3d3d3" : "#fff",
    },
    "& .tooltip": {
      visibility: "visible",
      opacity: 1,
    },
  },
}));

export const Tooltip = styled("div")({
  visibility: "hidden",
  opacity: 0,
  position: "absolute",
  bottom: "100%",
  left: "50%",
  transform: "translateX(-50%)",
  backgroundColor: "rgba(0, 0, 0, 0.85)",
  color: "#fff",
  padding: "4px 8px",
  fontSize: "0.60rem",
  borderRadius: "4px",
  whiteSpace: "nowrap",
  zIndex: 10,
  boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)",
  fontWeight: "bold",
  marginBottom: "8px",
  transition: "visibility 0s, opacity 0.3s ease",
  "&::after": {
    content: "''",
    position: "absolute",
    top: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    borderWidth: "5px",
    borderStyle: "solid",
    borderColor: "rgba(0, 0, 0, 0.85) transparent transparent transparent",
  },
});

export const IconWrapper = styled("div")(({ disabled, size }) => ({
  width: size ? `${size}px` : "32px",
  height: size ? `${size}px` : "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "6px",
  color: disabled ? "#d3d3d3" : "#63666A",
  transition: "color 0.3s ease",
  "& svg": {
    width: "90%",
    height: "90%",
  },
  "&:hover": {
    color: disabled ? "#d3d3d3" : "#fff",
  },
}));

// ── MODAL OVERLAY ─────────────────────────────────────────────────────────────

export const Overlay = styled("div")({
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
});

export const Modal = styled("div")({
  backgroundColor: "#FFFFFF",
  borderRadius: "8px",
  width: "90%",
  maxWidth: "400px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
  overflow: "hidden",
});

export const ModalHeader = styled("div")({
  padding: "16px 24px",
  borderBottom: "1px solid #E0E0E0",
  fontSize: "18px",
  fontWeight: 500,
  color: "#333333",
});

export const ModalBody = styled("div")({
  padding: "16px 24px",
  fontSize: "14px",
  color: "#4F4F4F",
  lineHeight: "1.5",
});

export const ModalFooter = styled("div")({
  padding: "12px 24px",
  borderTop: "1px solid #E0E0E0",
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px",
});

// ── MODAL ACTION BUTTON ───────────────────────────────────────────────────────

export const ConfirmButton = styled("button")({
  padding: "8px 16px",
  fontFamily: "Roboto, sans-serif",
  fontWeight: 500,
  fontSize: "14px",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  backgroundColor: "#BD302B",
  color: "#FFFFFF",
  transition: "background 0.2s ease-in-out",
  "&:hover": {
    backgroundColor: "#8A1F1A",
  },
});

// ── MESSAGE BOX (for “Checking cloud compatibility…”) ─────────────────────────

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
