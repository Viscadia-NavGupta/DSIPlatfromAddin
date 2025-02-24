import React from "react";
import {
  PageContainer,
  LogoContainer,
  BackButtonContainer,
  HeadingText,
  DescriptionText,
  FormContainer,
  InputField,
  Button,
  FooterContainer,
  FooterTextContainer,
  FooterImageContainer,
} from "./ForgotPasswordStyles";

const ForgotPassword = ({ setPageValue }) => {
  const navigateToLogin = () => {
    setPageValue("UserLogin");
  };

  const navigateToContactUs = () => {
    setPageValue("ContactUs");
  };

  const resetPassword = () => {
    alert("Password reset email sent!");
  };

  return (
    <PageContainer>
      <LogoContainer>
        <img src="/assets/Viscadia_logo_red.png" alt="Viscadia Logo" />
      </LogoContainer>
      <BackButtonContainer>
        <button onClick={navigateToLogin}>&larr;</button>
      </BackButtonContainer>
      <HeadingText>Forgot Password?</HeadingText>
      <DescriptionText>Enter your email for resetting the password.</DescriptionText>
      <FormContainer>
        <InputField type="email" placeholder="Enter Registered Email ID" />
        <Button primary onClick={resetPassword}>
          Reset Password
        </Button>
        <Button onClick={navigateToContactUs}>Contact Us</Button>
      </FormContainer>
      <FooterContainer>
        <FooterTextContainer>
          <span>© 2024 Viscadia. All rights reserved.</span>
        </FooterTextContainer>
        <FooterImageContainer>
          <img src="/assets/Flow.png" alt="Footer Background" />
        </FooterImageContainer>
      </FooterContainer>
    </PageContainer>
  );
};

export default ForgotPassword;
