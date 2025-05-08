import React, { useState, useEffect, useRef } from "react";
import { RiArrowDropDownLine } from "react-icons/ri";
import {
  Container,
  Heading,
  MessageBox,
  DropdownContainer,
  CustomDropdown,
  DropdownButton,
  DropdownList,
  DropdownItem,
  SaveButton,
  DropdownArrow,
} from "./FLSyncDataStyles";
import * as AWSconnections from "../../Middleware/AWSConnections";
import * as InputfileConnections from "../../Middleware/inputfile";
import * as excelconnections from "../../Middleware/ExcelConnection";
import CONFIG from "../../Middleware/AWSConnections";

const FLSyncData = ({ setPageValue }) => {
  const [modelIDValue, setModelIDValue] = useState("");
  const [saveStatus, setSaveStatus] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState([]);
  const [heading, setHeading] = useState("Active Sheet Name");
  const [isOutputSheet, setIsOutputSheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metadataLoaded, setMetadataLoaded] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const [warnings, setWarnings] = useState({
    saveStatus: false,
    cycle: false,
    asset: false,
  });

  const [fullData, setFullData] = useState([]);
  const [filteredSaveStatus, setFilteredSaveStatus] = useState([]);
  const [filteredCycles, setFilteredCycles] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);

  const [dropdownOpen, setDropdownOpen] = useState({
    saveStatus: false,
    cycle: false,
    asset: false,
  });

  const dropdownRefs = {
    saveStatus: useRef(null),
    cycle: useRef(null),
    asset: useRef(null),
  };

  useEffect(() => {
    function handleClickOutside(event) {
      Object.keys(dropdownRefs).forEach((key) => {
        if (dropdownRefs[key].current && !dropdownRefs[key].current.contains(event.target)) {
          setDropdownOpen((prev) => ({ ...prev, [key]: false }));
        }
      });
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const initSheet = async () => {
      await checkofCloudBackendSheet();
    };
    initSheet();
  }, []);

  useEffect(() => {
    if (modelIDValue) {
      fetchDataFromLambda();
    }
  }, [modelIDValue]);

  useEffect(() => {
    if (fullData.length > 0) {
      updateDropdownOptions();
    }
  }, [saveStatus, selectedCycle, selectedAsset, fullData]);

  // Update dropdown options
  const updateDropdownOptions = () => {
    setFilteredSaveStatus([...new Set(fullData.map((row) => row.save_status).filter(Boolean))]);
    setFilteredCycles([...new Set(fullData.map((row) => row.cycle_name).filter(Boolean))]);
    setFilteredAssets([...new Set(fullData.map((row) => row.asset).filter(Boolean))]);
  };

  const checkofCloudBackendSheet = async () => {
    try {
      if (typeof window.Excel === "undefined") {
        setLoading(false);
        return;
      }
      await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        sheets.load("items/name");
        await context.sync();

        const MetaDataSheet = sheets.items.find(
          (sheet) => sheet.name.toLowerCase() === "cloud_backend_md"
        );

        if (MetaDataSheet) {
          const ModelName = MetaDataSheet.getRange("B5");
          const ModelID = MetaDataSheet.getRange("B7");
          ModelName.load("values");
          ModelID.load("values");
          await context.sync();

          const ModelNameValue = ModelName.values[0][0] || "";
          const ModelIDValue = ModelID.values[0][0] || "";

          setHeading("Sync Data for Forecast Library");
          setIsOutputSheet(true);
          setModelIDValue(ModelIDValue);
        } else {
          setIsOutputSheet(false);
        }
        setLoading(false);
      });
    } catch (error) {
      console.error("Error checking sheet:", error);
      setIsOutputSheet(false);
      setLoading(false);
    }
  };

  const fetchDataFromLambda = async () => {
    try {
      setMetadataLoaded(false);
      const responseBody = await AWSconnections.FetchMetaData(
        "FETCH_METADATA",
        localStorage.getItem("idToken"),
        CONFIG.AWS_SECRETS_NAME,
        localStorage.getItem("User_ID"),
        localStorage.getItem("username")
      );

      if (!responseBody || !responseBody.results1) {
        throw new Error("No results1 found");
      }

      const filteredData = responseBody.results1.filter((row) => row.model_id === modelIDValue);
      setFullData(filteredData);

      setMetadataLoaded(true);
    } catch (error) {
      console.error("Error fetching metadata:", error);
      setMetadataLoaded(true);
    }
  };

  const handleMultiSelect = (key, value) => {
    const setter = {
      saveStatus: setSaveStatus,
      cycle: setSelectedCycle,
      asset: setSelectedAsset,
    }[key];

    const current = {
      saveStatus,
      cycle: selectedCycle,
      asset: selectedAsset,
    }[key];

    if (current.includes(value)) {
      setter(current.filter((v) => v !== value));
    } else {
      setter([...current, value]);
    }
  };

  const handleImportClick = async () => {
    const newWarnings = {
      saveStatus: saveStatus.length === 0,
      cycle: selectedCycle.length === 0,
      asset: selectedAsset.length === 0,
    };
    setWarnings(newWarnings);
    if (newWarnings.saveStatus || newWarnings.cycle || newWarnings.asset) return;

    const forecastIdArray = fullData
      .filter(row =>
        saveStatus.includes(row.save_status) &&
        selectedCycle.includes(row.cycle_name) &&
        selectedAsset.includes(row.asset)
      )
      .map(row => row.forecast_id.replace("forecast_", ""));

    if (forecastIdArray.length === 0) return;

    setImportProgress(0);
    for (let i = 0; i <= 50; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setPageValue("LoadingCircleComponent", `${i}% | Importing scenario...`);
      setImportProgress(i);
    }

    excelconnections.setCalculationMode("manual");
    try {
      const Downloadflag = await AWSconnections.service_orchestration(
        "IMPORT_ASSUMPTIONS",
        "",
        modelIDValue,
        "",
        selectedCycle,
        "",
        "",
        forecastIdArray
      );

      if (Downloadflag && Downloadflag.status === "Scenario Imported") {
        setPageValue("LoadingCircleComponent", "55% | Importing assumptions...");
        setImportProgress(55);
        await InputfileConnections.exportData2();
        setImportProgress(100);
        setPageValue("LoadingCircleComponent", "100% | Import completed");
        setPageValue("SaveForecastPageinterim", `Forecast scenario imported.`);
        excelconnections.setCalculationMode("automatic");
      } else {
        console.error("Scenario Import Failed:", Downloadflag);
      }
    } catch (error) {
      console.error("Error during import:", error);
    }
  };

  return (
    <Container>
      {loading || !metadataLoaded ? (
        <MessageBox>Checking cloud compatibility, please wait...</MessageBox>
      ) : isOutputSheet ? (
        <>
          <Heading>{heading}</Heading>
          <DropdownContainer>
            {["saveStatus", "cycle", "asset"].map((key) => (
              <CustomDropdown key={key} ref={dropdownRefs[key]}>
                <DropdownButton
                  onClick={() => setDropdownOpen({ ...dropdownOpen, [key]: !dropdownOpen[key] })}
                  style={warnings[key] ? { border: "1px solid red" } : {}}
                >
                  Select {key.charAt(0).toUpperCase() + key.slice(1)} ({{
                    saveStatus: saveStatus.length,
                    cycle: selectedCycle.length,
                    asset: selectedAsset.length,
                  }[key]} selected)
                  <DropdownArrow>
                    <RiArrowDropDownLine size={24} />
                  </DropdownArrow>
                </DropdownButton>
                {dropdownOpen[key] && (
                  <DropdownList>
                    {{
                      saveStatus: filteredSaveStatus,
                      cycle: filteredCycles,
                      asset: filteredAssets,
                    }[key].map((item, idx) => (
                      <DropdownItem key={idx} onClick={() => handleMultiSelect(key, item)}>
                        <input type="checkbox" checked={{
                          saveStatus,
                          cycle: selectedCycle,
                          asset: selectedAsset,
                        }[key].includes(item)} readOnly /> {item}
                      </DropdownItem>
                    ))}
                  </DropdownList>
                )}
              </CustomDropdown>
            ))}
          </DropdownContainer>
          <SaveButton onClick={handleImportClick}>Sync Data</SaveButton>
        </>
      ) : (
        <MessageBox>No Authorized model detected, please refresh the add-in.</MessageBox>
      )}
    </Container>
  );
};

export default FLSyncData;
