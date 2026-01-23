import React from "react";
import { FooterContainer, FooterLeft, FooterRight } from "./FooterStyles";

const Footer = ({ setPageValue }) => {
  const goToContact = (e) => {
    e.preventDefault();
    setPageValue("ContactUs");
  };
  return (
    <FooterContainer>
      <FooterLeft>© 2026 Viscadia. All rights reserved.</FooterLeft>
      <FooterRight>
        {/* <a href="#">Privacy Policy</a> */}
        <a href="#" onClick={goToContact}>
          Contact Us
        </a>
      </FooterRight>
    </FooterContainer>
  );
};

export default Footer;
