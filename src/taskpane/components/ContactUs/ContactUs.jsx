// ContactUs.jsx
import React, { useState } from "react";
import {
  PageContainer,
  LogoContainer,
  TitleContainer,
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [workArea, setWorkArea] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const navigateBack = () => setPageValue("UserLogin");

  const submitForm = async () => {
    setIsSubmitting(true);
    setError(null);

    const payload = { firstName, lastName, email, company, workArea, message };

    try {
      const res = await fetch(
        "https://prod-61.westus.logic.azure.com:443/workflows/d26cdfc46ba34b568ffc4549ec77964f/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=1aFl067CzilH9_VqmSGOeZ36BVqbGGgeDyEtfPHW4Ps",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error(`Flow returned ${res.status}`);
      setPageValue("SubmitPage");
    } catch (e) {
      console.error(e);
      setError("Something went wrong sending your message.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer>
      {/* Logo */}
      <LogoContainer>
        <img src="/assets/Viscadia_logo_red.png" alt="Viscadia Logo" />
      </LogoContainer>

      {/* Back + Title row */}
      <TitleContainer>
        <BackButtonContainer>
          <button onClick={navigateBack}>&larr;</button>
        </BackButtonContainer>
        <HeadingText>Contact Us</HeadingText>
      </TitleContainer>

      {/* Form */}
      <FormContainer>
        <div className="name-fields">
          <InputContainer>
            <InputField
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </InputContainer>
          <InputContainer>
            <InputField
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </InputContainer>
        </div>
        <InputContainer>
          <InputField type="email" placeholder="Email ID" value={email} onChange={(e) => setEmail(e.target.value)} />
        </InputContainer>
        <InputContainer>
          <TextAreaField
            placeholder="Write your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </InputContainer>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <Button primary onClick={submitForm} disabled={isSubmitting}>
          {isSubmitting ? "Sending…" : "Submit"}
        </Button>
      </FormContainer>

      {/* Footer */}
      <FooterContainer>
        <FooterTextContainer>
          <span>© 2025 Viscadia. All rights reserved.</span>
        </FooterTextContainer>
        <FooterImageContainer>
          <img src="/assets/ViscadiaFlow-Low.png" alt="Footer Background" />
        </FooterImageContainer>
      </FooterContainer>
    </PageContainer>
  );
};

export default ContactUs;
