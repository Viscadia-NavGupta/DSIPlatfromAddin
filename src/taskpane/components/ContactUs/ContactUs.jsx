import React from "react";
import {
  PageContainer,
  LogoContainer,
  BackButtonContainer,
  HeadingText,
  FormContainer,
  InputContainer,
  InputField,
  TextAreaField,
  Button,
  FooterContainer,
  FooterTextContainer,
  FooterImageContainer,
} from "./ContactUsStyles";

const ContactUs = ({ setPageValue }) => {
  const navigateBack = () => {
    setPageValue("UserLogin");
  };

  const submitForm = () => {
    setPageValue("SubmitPage");
  };

  return (
    <PageContainer>
      {/* Logo Section */}
      <LogoContainer>
        <img src="/assets/Viscadia_logo_red.png" alt="Viscadia Logo" />
      </LogoContainer>

      {/* Back Button */}
      <BackButtonContainer>
        <button onClick={navigateBack}>&larr;</button>
      </BackButtonContainer>

      {/* Heading */}
      <HeadingText>Contact Us</HeadingText>

      {/* Form Section */}
      <FormContainer>
        <div className="name-fields">
          <InputContainer>
            <InputField type="text" placeholder="First Name" />
          </InputContainer>
          <InputContainer>
            <InputField type="text" placeholder="Last Name" />
          </InputContainer>
        </div>
        <InputContainer>
          <InputField type="email" placeholder="Email ID" />
        </InputContainer>
        <InputContainer>
          <InputField type="text" placeholder="Company" />
        </InputContainer>
        <InputContainer>
          <InputField type="text" placeholder="Major Area of Work" />
        </InputContainer>
        <InputContainer>
          <TextAreaField placeholder="Write your message here..." />
        </InputContainer>
        <Button primary onClick={submitForm}>
          Submit
        </Button>
      </FormContainer>

      {/* Footer Section */}
      <FooterContainer>
        {/* Footer Text */}
        <FooterTextContainer>
          <span>© 2024 Viscadia. All rights reserved.</span>
        </FooterTextContainer>

        {/* Footer Image */}
        <FooterImageContainer>
          <img src="/assets/Flow.png" alt="Footer Background" />
        </FooterImageContainer>
      </FooterContainer>
    </PageContainer>
  );
};

export default ContactUs;
