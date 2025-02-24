import React from "react";
import { FooterContainer } from "./FooterStyles";

const Footer = () => {
  return (
    <FooterContainer>
      <p>© 2025 Viscadia. All rights reserved.</p>
      <div>
        <a href="/privacy-policy">Privacy Policy</a>
        <span> | </span>
        <a href="/contact-us">Contact Us</a>
      </div>
      <img
        src="/../assets/Viscadia_V_Logo.png"
        alt="Viscadia Logo"
        style={{ height: "30px" }}
      />
    </FooterContainer>
  );
};

export default Footer;
