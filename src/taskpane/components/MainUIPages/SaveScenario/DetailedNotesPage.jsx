import React, { useState } from "react";
import {
  Container,
  Header,
  BackButton,
  HeaderTitle,
  NotesSection,
  NotesLabel,
  NotesTextArea,
  SaveButton,
} from "./DetailedNotesPageStyles";

const DetailedNotesPage = ({ 
  setPageValue, 
  epidemiologyNotes = "",
  setEpidemiologyNotes,
  marketShareNotes = "",
  setMarketShareNotes,
  patientConversionNotes = "",
  setPatientConversionNotes,
  demandConversionNotes = "",
  setDemandConversionNotes,
  revenueConversionNotes = "",
  setRevenueConversionNotes
}) => {
  const handleBack = () => {
    setPageValue("SaveForecastPage");
  };

  const handleSave = () => {
    // Save logic can be implemented here
    console.log("Saving detailed notes...");
    setPageValue("SaveForecastPage");
  };

  return (
    <Container>
      <Header>
        <BackButton onClick={handleBack}>←</BackButton>
        <HeaderTitle>
          Save Scenario for:<br />
          Enhertu | HER2+ eBC
        </HeaderTitle>
      </Header>

      <NotesSection>
        <NotesLabel>Epidemiology</NotesLabel>
        <NotesTextArea
          value={epidemiologyNotes}
          onChange={(e) => setEpidemiologyNotes(e.target.value)}
          placeholder="Enter epidemiology notes..."
        />
      </NotesSection>

      <NotesSection>
        <NotesLabel>Market Share Assumptions</NotesLabel>
        <NotesTextArea
          value={marketShareNotes}
          onChange={(e) => setMarketShareNotes(e.target.value)}
          placeholder="Updated 1L market share for launch event from 15% to 20%"
        />
      </NotesSection>

      <NotesSection>
        <NotesLabel>Patient Conversion</NotesLabel>
        <NotesTextArea
          value={patientConversionNotes}
          onChange={(e) => setPatientConversionNotes(e.target.value)}
          placeholder="Enter patient conversion notes..."
        />
      </NotesSection>

      <NotesSection>
        <NotesLabel>Demand Conversion</NotesLabel>
        <NotesTextArea
          value={demandConversionNotes}
          onChange={(e) => setDemandConversionNotes(e.target.value)}
          placeholder="Enter demand conversion notes..."
        />
      </NotesSection>

      <NotesSection>
        <NotesLabel>Revenue Conversion</NotesLabel>
        <NotesTextArea
          value={revenueConversionNotes}
          onChange={(e) => setRevenueConversionNotes(e.target.value)}
          placeholder="Enter revenue conversion notes..."
        />
      </NotesSection>

      <SaveButton onClick={handleSave}>
        Save
      </SaveButton>
    </Container>
  );
};

export default DetailedNotesPage;