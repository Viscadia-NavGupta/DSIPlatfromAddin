// src/LoginPage/UserLogin.js
import React from "react";
import {
  PageContainer,
  LogoContainer,
  WelcomeText,
  FormContainer,
  InputField,
  CheckboxContainer,
  Button,
  FooterContainer,
  FooterTextContainer,
  FooterImageContainer,
} from "./UserLoginStyles";

const LoginPage = ({ setPageValue, handleLogin, errorMessage, setErrorMessage }) => {
  const navigateToForgotPassword = () => setPageValue("ForgotPassword");
  const navigateToContactUs = () => setPageValue("ContactUs");

  const loginUser = async (e) => {
    e.preventDefault();

    const username = e.currentTarget.username.value.trim();
    const password = e.currentTarget.password.value;

    if (!username || !password) {
      setErrorMessage("Please enter both username and password.");
      return;
    }
    if (!username.includes("@")) {
      setErrorMessage("Username must contain an '@' symbol.");
      return;
    }

    setErrorMessage("");

    try {
      await handleLogin(username, password);
    } catch (err) {
      console.error("Login error:", err);
      setErrorMessage("Login failed. Please check your username and password.");
    }
  };

  return (
    <PageContainer>
      <LogoContainer>
        <img src="/../assets/Viscadia_logo_red.png" alt="Viscadia Logo" />
      </LogoContainer>

      <WelcomeText>
        <h1>Welcome</h1>
        <p>Please enter your login details</p>
      </WelcomeText>

      <FormContainer onSubmit={loginUser}>
        {errorMessage && (
          <p style={{ color: "red", marginBottom: "10px" }}>{errorMessage}</p>
        )}

        <InputField name="username" type="text" placeholder="Username" />
        <InputField name="password" type="password" placeholder="Password" />

        <CheckboxContainer>
          <label>
            <input type="checkbox" />
            <span>Remember Me</span>
          </label>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigateToForgotPassword();
            }}
          >
            Forgot password?
          </a>
        </CheckboxContainer>

        <Button primary type="submit">
          Log In
        </Button>
        <Button
          onClick={(e) => {
            e.preventDefault();
            navigateToContactUs();
          }}
        >
          Contact Us
        </Button>
      </FormContainer>

      <FooterContainer>
        <FooterTextContainer>
          <span>© 2025 Viscadia. All rights reserved.</span>
        </FooterTextContainer>
        <FooterImageContainer>
          <img src="/../assets/ViscadiaFlow-Low.png" alt="Footer Background" />
        </FooterImageContainer>
      </FooterContainer>
    </PageContainer>
  );
};

export default LoginPage;
