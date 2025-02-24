import React from "react";
import { Overlay, LoadingContainer, LoadingCircle, LoadingMessage } from "./LoadingCirclestyles";

const LoadingCircleComponent = ({ message = "Running calculations..." }) => {
  return (
    <Overlay>
      <LoadingContainer>
        <LoadingCircle />
        <LoadingMessage>{message}</LoadingMessage>
      </LoadingContainer>
    </Overlay>
  );
};

export default LoadingCircleComponent;
