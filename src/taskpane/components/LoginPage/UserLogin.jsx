import React, { useState } from "react";
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

const LoginPage = ({ setPageValue, handleLogin }) => {
  const [errorMessage, setErrorMessage] = useState(""); // State to manage error messages

  const navigateToForgotPassword = () => {
    setPageValue("ForgotPassword");
  };

  const navigateToContactUs = () => {
    setPageValue("ContactUs");
  };

  const loginUser = async (e) => {
    e.preventDefault(); // Prevent page refresh on form submission

    const username = document.querySelector('input[placeholder="Username"]').value;
    const password = document.querySelector('input[placeholder="Password"]').value;

    // Validation for missing fields
    if (!username || !password) {
      setErrorMessage("Please enter both username and password.");
      return;
    }

    // Validation for "@" in the email
    // if (!username.includes("@")) {
    //   setErrorMessage("The username must contain an '@' symbol.");
    //   return;
    // }

    setErrorMessage(""); // Clear error message if inputs are valid

    try {
      // Call handleLogin with inputs
      const isAuthenticated = await handleLogin(username, password);

      if (!isAuthenticated) {
        setErrorMessage("Invalid username or password."); // Show error if login fails
      }
    } catch (error) {
      console.error("Login failed:", error);
      setErrorMessage("An error occurred. Please try again."); // Generic error message
    }
  };

  return (
    <PageContainer>
      {/* Logo Section */}
      <LogoContainer>
        <img src="/../assets/Viscadia_logo_red.png" alt="Viscadia Logo" />
      </LogoContainer>

      {/* Welcome Text */}
      <WelcomeText>
        <h1>Welcome</h1>
        <p>Please enter your login details</p>
      </WelcomeText>

      {/* Login Form */}
      <FormContainer onSubmit={loginUser}>
        {/* Display error message */}
        {errorMessage && <p style={{ color: "red", marginBottom: "10px" }}>{errorMessage}</p>}
        <InputField type="text" placeholder="Username" />
        <InputField type="password" placeholder="Password" />
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
        <Button primary onClick={loginUser}>
          Log In
        </Button>
        <Button onClick={navigateToContactUs}>Contact Us</Button>
      </FormContainer>

      {/* Footer Section */}
      <FooterContainer>
        {/* Footer Text */}
        <FooterTextContainer>
          <span>© 2024 Viscadia. All rights reserved.</span>
        </FooterTextContainer>

        {/* Footer Image */}
        <FooterImageContainer>
          <img src="/../assets/Flow.png" alt="Footer Background" />
        </FooterImageContainer>
      </FooterContainer>
    </PageContainer>
  );
};

export default LoginPage;
