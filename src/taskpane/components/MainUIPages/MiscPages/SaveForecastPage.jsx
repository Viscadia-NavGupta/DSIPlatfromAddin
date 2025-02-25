import React from "react";
import {
  Container,
  Heading,
  MessageBox,
  SaveButton,
} from "./saveforecastpagestyles";

const SaveForecastPageinterim = ({ setPageValue, message }) => {
  const handleButtonClick = () => {
    setPageValue("Home");
  };

  return (
    <Container>
      <MessageBox>{message}</MessageBox>
      <SaveButton onClick={handleButtonClick}>Go to Home</SaveButton>
    </Container>
  );
};

export default SaveForecastPageinterim;