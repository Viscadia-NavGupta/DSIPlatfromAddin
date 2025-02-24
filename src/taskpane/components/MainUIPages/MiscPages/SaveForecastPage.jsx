import React from "react";
import {
  Container,
  Heading,
  MessageBox,
  SaveButton,
} from "./saveforecastpagestyles";

const SaveForecastPageinterim = ({ setPageValue }) => {
  const handleButtonClick = () => {
    setPageValue("Home");
  };

  return (
    <Container>
      <MessageBox>Forecast is saved</MessageBox>
      <SaveButton onClick={handleButtonClick}>Go to Home</SaveButton>
    </Container>
  );
};

export default SaveForecastPageinterim;
