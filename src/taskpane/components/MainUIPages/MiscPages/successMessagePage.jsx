// SaveForecastPageInterim.jsx
import React from "react";
import { Container, MessageBox, SaveButton } from "./successMessagePageStyles";
import { FaCheckCircle } from "react-icons/fa";

const SuccessMessagePage = ({ setPageValue, message }) => {
  const handleButtonClick = () => setPageValue("Home");

  return (
    <Container>
      <FaCheckCircle
        size={32}
        style={{ color: "green", marginBottom: "20px" }}
        aria-label="Success"
      />

      {/* 
        Split on \n so we always get line-breaks,
        even if CSS isn’t cooperating
      */}
      <MessageBox>
        {message.split("\n").map((line, i) => (
          <React.Fragment key={i}>
            {line}
            <br />
          </React.Fragment>
        ))}
      </MessageBox>

      <SaveButton onClick={handleButtonClick}>Go to Home</SaveButton>
    </Container>
  );
};

export default SuccessMessagePage;
