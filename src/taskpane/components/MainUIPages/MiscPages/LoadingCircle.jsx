import React from "react";
import { Overlay, LoadingContainer, LoadingCircle, LoadingMessage } from "./LoadingCirclestyles";

const LoadingCircleComponent = ({ message = "Running calculations..." }) => {
  return (
    <Overlay>
      <LoadingContainer>
        <LoadingCircle>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} />
          ))}
        </LoadingCircle>
        <LoadingMessage>{message}</LoadingMessage>
      </LoadingContainer>
    </Overlay>
  );
};

export default LoadingCircleComponent;
