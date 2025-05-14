import React, { useState } from "react";
import {
  PageContainer,
  LogoContainer,
  TitleContainer,
  BackButtonContainer,
  HeadingText,
  DescriptionText,
  FormContainer,
  InputField,
  ErrorText,
  Button,
  FooterContainer,
  FooterTextContainer,
  FooterImageContainer,
} from "./ResetPasswordStyles";

import * as Authfucntions from "../Middleware/Auth";

const ResetPassword = ({ setPageValue, email }) => {
  const [otp, setOtp] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [errors, setErrors] = useState({ otp: "", newPwd: "", confirmPwd: "" });
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false);

  const pwdPolicy = /^(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

  const validateAndSubmit = async () => {
    setGeneralError("");
    const e = { otp: "", newPwd: "", confirmPwd: "" };
    let ok = true;

    if (!otp.trim()) {
      e.otp = "Please enter the OTP.";
      ok = false;
    }
    if (!pwdPolicy.test(newPwd)) {
      e.newPwd =
        "Password must be at least 8 characters and include a special character.";
      ok = false;
    }
    if (confirmPwd !== newPwd) {
      e.confirmPwd = "Passwords do not match.";
      ok = false;
    }

    setErrors(e);
    if (!ok) return;

    setLoading(true);
    try {
      const response = await Authfucntions.verifyOTPAndReset(email, otp, newPwd);
      if (response.ok) {
        setPageValue("PasswordResetSuccess");
      } else {
        setGeneralError(
          "Failed to reset password. Please try again or contact us."
        );
      }
    } catch (err) {
      console.error(err);
      setGeneralError(
        "Failed to reset password. Please try again or contact us."
      );
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
          <button onClick={() => setPageValue("ForgotPassword")}>&larr;</button>
        </BackButtonContainer>
        <HeadingText>Reset Password</HeadingText>
      </TitleContainer>

      <DescriptionText>
        Enter the OTP sent to <strong>{email}</strong> and choose a new password.
      </DescriptionText>

      <FormContainer>
        <InputField
          type="text"
          placeholder="OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
        />
        {errors.otp && <ErrorText>{errors.otp}</ErrorText>}

        <InputField
          type="password"
          placeholder="New Password"
          value={newPwd}
          onChange={(e) => setNewPwd(e.target.value)}
        />
        {errors.newPwd && <ErrorText>{errors.newPwd}</ErrorText>}

        <InputField
          type="password"
          placeholder="Confirm Password"
          value={confirmPwd}
          onChange={(e) => setConfirmPwd(e.target.value)}
        />
        {errors.confirmPwd && <ErrorText>{errors.confirmPwd}</ErrorText>}

        {generalError && <ErrorText>{generalError}</ErrorText>}

        <Button primary onClick={validateAndSubmit} disabled={loading}>
          {loading ? "Submitting…" : "Submit"}
        </Button>
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

export default ResetPassword;
