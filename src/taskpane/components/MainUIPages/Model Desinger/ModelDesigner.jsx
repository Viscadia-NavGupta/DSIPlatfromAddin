import React from "react";
import { FaArrowLeft } from "react-icons/fa";
import {
  Container,
  ButtonsContainer,
  Button,
  Icon,
  Label,
  WelcomeContainer,
  BackButtonIcon,
} from "./ModelDesignerStyles";
import * as ExcelFunctions from "../../Middleware/ExcelConnection";
import * as MMfunctions from "../../Middleware/MMFucntions";
import * as AWSConnections from "../../Middleware/AWSConnections";

const MMSheetManagement = ({ setPageValue }) => {
  // Navigate back to Home page
  const handleBack = () => {
    setPageValue("Home");
  };

  // Generate ACE sheet
  const handleGenerateACE = async () => {
    try {
      setPageValue("LoadingCircleComponent", "Genrating Model...");
      const serviceFlag = await AWSConnections.service_orchestration(
        "GENERATE_ACE_SHEET"
      );
      setPageValue("SuccessMessagePage", "Model Genarated Successfully");
      console.log(serviceFlag.result);
    } catch (error) {
      console.error("Error generating ACE:", error);
    }
  };

  const menuItems = [
    { icon: "/assets/Createmodel.svg", text: "Generate ACE", action: handleGenerateACE },
    { icon: "/assets/AddAssumptions.svg", text: "Add Assumption", action: MMfunctions.addAssumption },
    { icon: "/assets/deleteAssumption.svg", text: "Delete Assumption", action: MMfunctions.deleteAssumption },
    { icon: "/assets/addflow.svg", text: "Add Flow", action: MMfunctions.addFlow },
    { icon: "/assets/deleteflow.svg", text: "Delete Flow", action: MMfunctions.deleteflow },
    { icon: "/assets/adddimension.svg", text: "Add Node", action: MMfunctions.addDimension1 },
    { icon: "/assets/deletedimension.svg", text: "Delete Node", action: MMfunctions.deletediemnsions },
    { icon: "/assets/addproduct.svg", text: "Add SKU", action: MMfunctions.addSku },
    { icon: "/assets/addproduct.svg", text: "Delete SKU", action: MMfunctions.DeleteSku },
    { icon: "/assets/addproduct.svg", text: "Add Product", action: MMfunctions.addProduct },
    { icon: "/assets/addproduct.svg", text: "Delete Product", action: MMfunctions.deleteProduct },
  ];

  return (
    <Container>
      {/* Header with Back button + Title */}
      <WelcomeContainer>
        <BackButtonIcon as={FaArrowLeft} size={24} onClick={handleBack} />
        <h1>Design New Model</h1>
      </WelcomeContainer>

      <ButtonsContainer>
        {menuItems.map((item, i) => (
          <Button key={i} onClick={item.action}>
            <Icon src={item.icon} alt={`${item.text} icon`} />
            <Label>{item.text}</Label>
          </Button>
        ))}
      </ButtonsContainer>
    </Container>
  );
};

export default MMSheetManagement;
