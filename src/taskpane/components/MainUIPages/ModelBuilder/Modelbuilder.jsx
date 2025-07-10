import React, { useEffect } from "react";
import {
  Container,
  ModelManagementTitle,
  ButtonsContainer,
  Button,
  Icon,
  FreshLabel,
  LoadLabel,
} from "./ModelBuilderStyles";
import { MdFolderOpen, MdAccountTree } from "react-icons/md";
import * as Excelfunctions from "../../Middleware/ExcelConnection";

const ModelManagementPage1 = ({ setPageValue }) => {
  // Log the current user
  const username = sessionStorage.getItem("username");
  console.log("User:", username);

  // Unhide sheets on mount
  useEffect(() => {
    Excelfunctions.unhideSheet("Model Management");
    Excelfunctions.activateSheet("Model Management");
  }, []);

  // Open & select A1 in the Model Management sheet
  const unhideActivateSheetAndSelectA1 = () => {
    Excel.run(async (context) => {
      const sheetName = "Model Management | Demo";
      const sheet = context.workbook.worksheets.getItemOrNullObject(sheetName);
      sheet.load("visibility");
      await context.sync();

      if (!sheet.isNullObject) {
        if (sheet.visibility === Excel.SheetVisibility.hidden) {
          sheet.visibility = Excel.SheetVisibility.visible;
        }
        sheet.activate();
        sheet.getRange("A1").select();
        await context.sync();
      } else {
        console.warn(`Sheet "${sheetName}" not found.`);
      }
    }).catch(console.error);
  };

  // Handlers
  const handleCreateNewModel = () => {
    unhideActivateSheetAndSelectA1();
    setPageValue("MMSheetManagment");
  };
  const handleLoadExistingModel = () => {
    setPageValue("Importfunnel");
  };

  return (
    <Container>
      <ModelManagementTitle>Model Management</ModelManagementTitle>

      <ButtonsContainer>
        <Button type="button" onClick={handleCreateNewModel}>
          <Icon as={MdAccountTree} />
          <FreshLabel>Design New</FreshLabel>
        </Button>

        <Button type="button" onClick={handleLoadExistingModel}>
          <Icon as={MdFolderOpen} />
          <LoadLabel>Load Existing</LoadLabel>
        </Button>
      </ButtonsContainer>
    </Container>
  );
};

export default ModelManagementPage1;
