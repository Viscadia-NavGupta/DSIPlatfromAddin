import React from "react";
import { HeaderContainer, LogoContainer, HeadingContainer } from "./HeaderStyles";

const Header = () => {
  return (
    <HeaderContainer>
      <LogoContainer>
        <img
          src="/../assets/Viscadia_V_Logo.png"
          alt="Viscadia Logo"
        />
      </LogoContainer>
      <HeadingContainer>
        <h1>Viscadia Forecasting Solution</h1>
      </HeadingContainer>
    </HeaderContainer>
  );
};

export default Header;
