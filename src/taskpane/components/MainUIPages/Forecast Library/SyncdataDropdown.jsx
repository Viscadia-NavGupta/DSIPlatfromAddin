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
  DropdownArrow,
  SaveButton,
} from "./FLSyncDataStyles";
import * as AWSconnections from "../../Middleware/AWSConnections";
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
  const [warnings, setWarnings] = useState({ saveStatus: false, cycle: false, asset: false });

  const [fullData, setFullData] = useState([]);
  const [filteredSaveStatus, setFilteredSaveStatus] = useState([]);
  const [filteredCycles, setFilteredCycles] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);

  const [dropdownOpen, setDropdownOpen] = useState({ saveStatus: false, cycle: false, asset: false });
  const dropdownRefs = { saveStatus: useRef(null), cycle: useRef(null), asset: useRef(null) };

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

  useEffect(() => { checkCloudBackendSheet(); }, []);
  useEffect(() => { fetchDataFromLambda(); }, [modelIDValue]);
  useEffect(() => { if (fullData.length) updateDropdownOptions(); }, [fullData]);

  const checkCloudBackendSheet = async () => {
    try {
      if (typeof window.Excel === "undefined") { setLoading(false); return; }
      await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        sheets.load("items/name"); await context.sync();
        const md = sheets.items.find(s => s.name.toLowerCase() === "cloud_backend_md");
        if (md) {
          const rID = md.getRange("B7"); rID.load("values"); await context.sync();
          setModelIDValue(rID.values[0][0] || "");
          setHeading("Sync Data for Forecast Library");
          setIsOutputSheet(true);
        } else {
          setIsOutputSheet(false);
        }
      });
    } catch (e) {
      console.error(e); setIsOutputSheet(false);
    } finally { setLoading(false); }
  };

  const fetchDataFromLambda = async () => {
    try {
      setMetadataLoaded(false);
      const response = await AWSconnections.FetchMetaData(
        "FETCH_METADATA",
        localStorage.getItem("idToken"),
        CONFIG.AWS_SECRETS_NAME,
        localStorage.getItem("User_ID"),
        localStorage.getItem("username")
      );
      const data = Array.isArray(response.results1) ? response.results1 : [];
      setFullData(data);
    } catch (e) {
      console.error("Error fetching metadata:", e);
    } finally {
      setMetadataLoaded(true);
    }
  };

  const updateDropdownOptions = () => {
    setFilteredSaveStatus([...new Set(fullData.map(r => r.save_status).filter(Boolean))]);

    // 🚫 Exclude "ACTUALS" from cycle dropdown
    setFilteredCycles([
      ...new Set(
        fullData
          .map(r => r.cycle_name)
          .filter(name => Boolean(name) && name.toUpperCase() !== "ACTUALS")
      )
    ]);

    setFilteredAssets([...new Set(fullData.map(r => r.asset).filter(Boolean))]);
  };

  const handleMultiSelect = (key, value) => {
    const current = { saveStatus, cycle: selectedCycle, asset: selectedAsset }[key];
    const setter = { saveStatus: setSaveStatus, cycle: setSelectedCycle, asset: setSelectedAsset }[key];
    setter(current.includes(value) ? current.filter(v => v !== value) : [...current, value]);
  };

  const handleSyncData = async () => {
    const warn = { saveStatus: !saveStatus.length, cycle: !selectedCycle.length, asset: !selectedAsset.length };
    setWarnings(warn);
    // excelconnections.unprotectWorkbookAndSheet("Setup","Overarching@123");
    if (warn.saveStatus || warn.cycle || warn.asset) return;
    setPageValue("LoadingCircleComponent", "Syncing data, please wait...");

    try {
      setLoading(true);
      const response = await AWSconnections.FetchMetaData(
        "FETCH_METADATA",
        localStorage.getItem("idToken"),
        CONFIG.AWS_SECRETS_NAME,
        localStorage.getItem("User_ID"),
        localStorage.getItem("username")
      );
      const filtered = response.results1.filter(row =>
        saveStatus.includes(row.save_status) &&
        selectedCycle.includes(row.cycle_name) &&
        selectedAsset.includes(row.asset)
      );
      await excelconnections.MetaDataSyncwithoutheaders({ results1: filtered }, "cloud_backend_ds", "A2");
      await excelconnections.refreshPivotTable("Setup", "PivotTable3");
      // excelconnections.protectSetupSheet("Overarching@123");
      setPageValue("SuccessMessagePage", "Data synced successfully.");
    } catch (e) {
      console.error("Sync Data Error:", e);
      setPageValue("SaveForecastPageinterim", "Error syncing data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      {loading || !metadataLoaded ? (
        <MessageBox>Connecting to data lake, please wait…</MessageBox>
      ) : isOutputSheet ? (
        <>
          <Heading>{heading}</Heading>
          <DropdownContainer>
            {[ 'cycle', 'asset','saveStatus'].map(key => (
              <CustomDropdown key={key} ref={dropdownRefs[key]}>
                <DropdownButton
                  onClick={() => setDropdownOpen(prev => ({ ...prev, [key]: !prev[key] }))}
                  style={warnings[key] ? { border: '1px solid #B4322A' } : {}}
                >
                  Select {key.charAt(0).toUpperCase() + key.slice(1)} ({
                    { saveStatus: saveStatus.length, cycle: selectedCycle.length, asset: selectedAsset.length }[key]
                  } selected)
                  <DropdownArrow><RiArrowDropDownLine size={24} /></DropdownArrow>
                </DropdownButton>
                {dropdownOpen[key] && (
                  <DropdownList>
                    <DropdownItem onClick={() => {
                      const list = { saveStatus: filteredSaveStatus, cycle: filteredCycles, asset: filteredAssets }[key];
                      const selected = { saveStatus, cycle: selectedCycle, asset: selectedAsset }[key];
                      const setter = { saveStatus: setSaveStatus, cycle: setSelectedCycle, asset: setSelectedAsset }[key];
                      if (selected.length === list.length) {
                        setter([]);
                      } else {
                        setter([...list]);
                      }
                    }}>
                      <input
                        type="checkbox"
                        checked={
                          { saveStatus, cycle: selectedCycle, asset: selectedAsset }[key].length ===
                          { saveStatus: filteredSaveStatus, cycle: filteredCycles, asset: filteredAssets }[key].length
                        }
                        readOnly
                      /> Select All
                    </DropdownItem>

                    {{ saveStatus: filteredSaveStatus, cycle: filteredCycles, asset: filteredAssets }[key]
                      .map((item, i) => (
                        <DropdownItem key={i} onClick={() => handleMultiSelect(key, item)}>
                          <input
                            type="checkbox"
                            checked={{ saveStatus, cycle: selectedCycle, asset: selectedAsset }[key].includes(item)}
                            readOnly
                          /> {item}
                        </DropdownItem>
                      ))}
                  </DropdownList>
                )}
              </CustomDropdown>
            ))}
          </DropdownContainer>
          <SaveButton onClick={handleSyncData}>Sync Data</SaveButton>
        </>
      ) : (
        <MessageBox> Not an authorized Forecast Library. - Current workbook is not a compatible version of Forecast Library. Please open the latest Forecast Library version to use this feature</MessageBox>
      )}
    </Container>
  );
};

export default FLSyncData;
