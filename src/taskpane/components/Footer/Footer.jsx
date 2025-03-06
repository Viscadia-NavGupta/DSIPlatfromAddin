import React from "react";
import { FooterContainer, FooterLeft, FooterRight } from "./FooterStyles";

const Footer = () => {
  return (
    <FooterContainer>
      <FooterLeft>© 2025 Viscadia. All rights reserved.</FooterLeft>
      <FooterRight>
        <a href="/privacy-policy">Privacy Policy</a>
        <a href="/contact-us">Contact Us</a>
      </FooterRight>
    </FooterContainer>
  );
};

export default Footer;
