// PasswordResetSuccess.jsx
import React from "react";
import {
  PageContainer,
  LogoContainer,
  SuccessContainer,
  SuccessText,
  Button,
  FooterContainer,
  FooterTextContainer,
  FooterImageContainer,
} from "./PasswordResetSuccessStyles";

const PasswordResetSuccess = ({ setPageValue }) => {
  return (
    <PageContainer>
      <LogoContainer>
        <img src="/assets/Viscadia_logo_red.png" alt="Viscadia Logo" />
      </LogoContainer>

      <SuccessContainer>
        <SuccessText>Password changed successfully!</SuccessText>
        <Button primary onClick={() => setPageValue("UserLogin")}>
          Back to Login
        </Button>
      </SuccessContainer>

      <FooterContainer>
        <FooterTextContainer>
          <span>© 2025 Viscadia. All rights reserved.</span>
        </FooterTextContainer>
        <FooterImageContainer>
          <img
            src="/assets/ViscadiaFlow-Low.png"
            alt="Footer Background"
          />
        </FooterImageContainer>
      </FooterContainer>
    </PageContainer>
  );
};

export default PasswordResetSuccess;
