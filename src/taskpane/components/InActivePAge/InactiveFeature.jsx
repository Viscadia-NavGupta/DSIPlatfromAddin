import React from "react";
import { Card, Message, Button } from "./InactiveFeatureStyles";

const InactiveFeature = () => {
  return (
    <Card>
      <Message>
        <span>ℹ️</span> This feature is currently inactive
      </Message>
      <p>
        Please contact our team to activate this exclusive feature.
      </p>
      <Button>Contact Support</Button>
    </Card>
  );
};

export default InactiveFeature;
