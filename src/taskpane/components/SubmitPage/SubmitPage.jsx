import React from "react";
import {
  PageContainer,
  LogoContainer,
  MessageContainer,
  SuccessIcon,
  Heading,
  SubHeading,
  Button,
  FooterText,
} from "./SubmitPageStyles";

const SubmitPage = ({ setPageValue }) => {
  return (
    <PageContainer>
      <LogoContainer>
        <img src="/../assets/Viscadia_logo_red.png" alt="Viscadia Logo" />
      </LogoContainer>
      <MessageContainer>
        <SuccessIcon>✔</SuccessIcon>
        <Heading>Request Submitted</Heading>
        <SubHeading>
          Thank you! Your message has been successfully submitted.
        </SubHeading>
      </MessageContainer>
      <Button onClick={() => setPageValue("UserLogin")}>Return Home</Button>
      <FooterText>© 2024 Viscadia. All rights reserved.</FooterText>
    </PageContainer>
  );
};

export default SubmitPage;
