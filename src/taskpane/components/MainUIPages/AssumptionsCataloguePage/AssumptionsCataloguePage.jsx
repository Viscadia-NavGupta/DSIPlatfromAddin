import React, { useState } from "react";
import {
  PageContainer,
  HeaderContainer,
  BackButton,
  Title,
  DropdownContainer,
  Dropdown,
  ImportButton,
} from "./AssumptionsCataloguePageStyles";

import { FaArrowLeft } from "react-icons/fa";

const AssumptionsCataloguePage = ({ onBack }) => {
  const [cycle, setCycle] = useState("");
  const [asset, setAsset] = useState("");

  const cycles = ["Cycle 1", "Cycle 2"];
  const assets = [
    "Asset 1 | Indication 1 | Scenario A",
    "Asset 2 | Indication 2 | Scenario B",
  ];

  return (
    <PageContainer>
      {/* Header */}
      <HeaderContainer>
        <BackButton onClick={onBack}>
          <FaArrowLeft />
        </BackButton>
        <Title>Assumptions Catalogue</Title>
      </HeaderContainer>

      {/* Dropdowns */}
      <DropdownContainer>
        <Dropdown
          value={cycle}
          onChange={(e) => setCycle(e.target.value)}
        >
          <option value="" disabled>
            Cycle
          </option>
          {cycles.map((item, index) => (
            <option key={index} value={item}>
              {item}
            </option>
          ))}
        </Dropdown>

        <Dropdown
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
        >
          <option value="" disabled>
            Asset | Indication | Scenario
          </option>
          {assets.map((item, index) => (
            <option key={index} value={item}>
              {item}
            </option>
          ))}
        </Dropdown>
      </DropdownContainer>

      {/* Import Button */}
      <ImportButton onClick={() => console.log("Import Data")}>
        Import Data
      </ImportButton>
    </PageContainer>
  );
};

export default AssumptionsCataloguePage;
