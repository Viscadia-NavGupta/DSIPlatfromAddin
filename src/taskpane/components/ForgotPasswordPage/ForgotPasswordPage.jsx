// ForgotPassword.jsx
import React, { useState } from "react";
import {
  PageContainer, LogoContainer, TitleContainer,
  BackButtonContainer, HeadingText, DescriptionText,
  FormContainer, InputField, Button,
  FooterContainer, FooterTextContainer, FooterImageContainer
} from "./ForgotPasswordStyles";

import * as Authfucntions from "../Middleware/Auth";

const ForgotPassword = ({ setPageValue, setResetEmail }) => {
  const [email, setEmail]     = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const navigateToLogin     = () => setPageValue("UserLogin");
  const navigateToContactUs = () => setPageValue("ContactUs");

  const handleSendOTP = async () => {
    setError("");
    if (!email.trim()) {
      setError("Please enter your registered email.");
      return;
    }

    setLoading(true);
    try {
      const response = await Authfucntions.sendOTP(email);
      if (response.ok) {
        // store the email for the next page:
        setResetEmail(email);
        // now navigate:
        setPageValue("ResetPassword");
      } else {
        setError("Invalid credential. Try again later or contact us.");
      }
    } catch (e) {
      console.error(e);
      setError("Invalid credential. Try again later or contact us.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <LogoContainer>
        <img src="/assets/Viscadia_logo_red.png" alt="Viscadia Logo" />
      </LogoContainer>

      <TitleContainer>
        <BackButtonContainer>
          <button onClick={navigateToLogin}>&larr;</button>
        </BackButtonContainer>
        <HeadingText>Forgot Password?</HeadingText>
      </TitleContainer>

      <DescriptionText>
        Enter your email for resetting the password.
      </DescriptionText>

      <FormContainer>
        <InputField
          type="email"
          placeholder="Enter Registered Email ID"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error && (
          <div style={{ color: "red", marginBottom: "0.5rem" }}>
            {error}
          </div>
        )}
        <Button primary onClick={handleSendOTP} disabled={loading}>
          {loading ? "Sending…" : "Reset Password"}
        </Button>
        <Button onClick={navigateToContactUs}>Contact Us</Button>
      </FormContainer>

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

export default ForgotPassword;
