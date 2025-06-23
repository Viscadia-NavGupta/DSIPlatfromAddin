// LoadingCirclestyles.js

import { styled } from "@mui/system";

export const Overlay = styled("div")({
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(255, 255, 255, 0.8)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
});

export const LoadingContainer = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
});

export const LoadingCircle = styled("div")({
  position: "relative",
  width: "60px",
  height: "60px",

  "& div": {
    position: "absolute",
    top: "6px",
    left: "27px",             // (60/2) - (6/2)
    width: "6px",
    height: "18px",
    borderRadius: "3px",
    backgroundColor: "#3498db",
    transformOrigin: "3px 30px",  // pivot at bottom-center
    animation: "fade 1.2s linear infinite",
  },

  "& div:nth-of-type(1)":  { transform: "rotate(0deg)",   animationDelay: "0s"    },
  "& div:nth-of-type(2)":  { transform: "rotate(30deg)",  animationDelay: "-1.1s" },
  "& div:nth-of-type(3)":  { transform: "rotate(60deg)",  animationDelay: "-1s"   },
  "& div:nth-of-type(4)":  { transform: "rotate(90deg)",  animationDelay: "-0.9s" },
  "& div:nth-of-type(5)":  { transform: "rotate(120deg)", animationDelay: "-0.8s" },
  "& div:nth-of-type(6)":  { transform: "rotate(150deg)", animationDelay: "-0.7s" },
  "& div:nth-of-type(7)":  { transform: "rotate(180deg)", animationDelay: "-0.6s" },
  "& div:nth-of-type(8)":  { transform: "rotate(210deg)", animationDelay: "-0.5s" },
  "& div:nth-of-type(9)":  { transform: "rotate(240deg)", animationDelay: "-0.4s" },
  "& div:nth-of-type(10)": { transform: "rotate(270deg)", animationDelay: "-0.3s" },
  "& div:nth-of-type(11)": { transform: "rotate(300deg)", animationDelay: "-0.2s" },
  "& div:nth-of-type(12)": { transform: "rotate(330deg)", animationDelay: "-0.1s" },

  "@keyframes fade": {
    "0%, 39%, 100%": { opacity: 0.25 },
    "40%":           { opacity: 1    },
  },
});

export const LoadingMessage = styled("p")({
  marginTop: "12px",
  fontSize: "1rem",
  color: "#333",
  textAlign: "center",
});
