import React, {
  useState,
  useEffect,
  useCallback,
  useMemo
} from "react";
import {
  Container,
  Heading,
  MessageBox,
  DropdownContainer,
  Input,
  SaveButton,
  Overlay,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "./saveactualsstyles";
import { DataFrame } from "dataframe-js";
import * as AWSconnections from "../../Middleware/AWSConnections";
import * as excelfucntions from "../../Middleware/ExcelConnection";
import * as Excelconnections from "../../Middleware/ExcelConnection";
import CONFIG from "../../Middleware/AWSConnections";

const SaveScenarioActuals = ({ setPageValue }) => {
  const [scenarioName, setScenarioName] = useState("");
  const [heading, setHeading] = useState("Active Sheet Name");
  const [isOutputSheet, setIsOutputSheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modelIDValue, setModelIDValue] = useState("");
  const [modelType, setModelType] = useState("");
  const [dataFrames, setDataFrames] = useState({
    dfResult1: null,
    dfResult2: null,
    dfResult3: null,
  });

  // --- scenarioSet logic ---
  const scenarioSet = useMemo(() => {
    const df = dataFrames.dfResult1;
    if (!df) return new Set();
    return new Set(
      df
        .toCollection()
        .map((r) => {
          const id = (r.model_id ?? "").toString().trim();
          const cycle = (r.cycle_name ?? "").toString().trim();
          const scen = (r.scenario_name ?? "")
            .toString()
            .trim()
            .toLowerCase();
          return `${id}|${cycle}|${scen}`;
        })
    );
  }, [dataFrames.dfResult1]);

  const checkScenarioExists = useCallback(
    (modelId, cycleName, scenarioName) => {
      if (!dataFrames.dfResult1) return false;
      const key = `${modelId}|${cycleName}|${scenarioName
        .trim()
        .toLowerCase()}`;
      return scenarioSet.has(key);
    },
    [dataFrames.dfResult1, scenarioSet]
  );

  // --- modal state & handlers ---
  const [showConfirm, setShowConfirm] = useState(false);
  const actualsCycle = "ACTUALS";

  const handleInitialClick = useCallback(() => {
    setShowConfirm(true);
  }, []);

  const handleCancel = useCallback(() => {
    setShowConfirm(false);
  }, []);

  const handleConfirm = useCallback(async () => {
    setShowConfirm(false);
    console.time("Total save time request");
    setPageValue("LoadingCircleComponent", "0% | Saving your actuals...");

    if (checkScenarioExists(modelIDValue, actualsCycle, scenarioName)) {
      setPageValue(
        "SaveForecastPageinterim",
        "Actuals scenario name already in use"
      );
      console.timeEnd("Total save time request");
      return;
    }

    try {
      await excelfucntions.setCalculationMode("manual");
      const [longformData] = await Promise.all([
        excelfucntions.generateLongFormData("US", "DataModel_Actuals"),
      ]);

      setPageValue("LoadingCircleComponent", "75% | Saving your actuals...");

      // read last actuals date & format
      const actualsLastDateRaw = await Excelconnections.readNamedRangeToArray(
        "actuals_last_month"
      );
      const rawSerial = actualsLastDateRaw[0][0];
      const convertedDate = excelSerialToJSDate(rawSerial);
      const formattedActualsDate = formatToMMMYY(convertedDate);

      const saveFlag = await AWSconnections.service_orchestration(
        "SAVE_ACTUALS",
        "",
        modelIDValue,
        scenarioName,
        actualsCycle,
        "",
        "",
        "",
        longformData,
        [],
        [],
        [],
        [],
        setPageValue
      );

      setPageValue(
        "SaveForecastPageinterim",
        saveFlag === "SUCCESS" || saveFlag?.result === "DONE"
          ? `Actuals Scenario saved for Model: ${heading.replace(
              "Save Scenario for: ",
              ""
            )} | Actuals Till: ${formattedActualsDate} | Scenario: ${scenarioName}`
          : "Some Error Occurred, Please try again"
      );
    } catch (error) {
      console.error("Error during save process:", error);
      setPageValue(
        "SaveForecastPageinterim",
        "An error occurred during save"
      );
    } finally {
      console.timeEnd("Total save time request");
    }
  }, [
    modelIDValue,
    scenarioName,
    heading,
    checkScenarioExists,
    setPageValue,
  ]);

  // --- original sheet check & data fetch ---
  const checkofCloudBackendSheet = useCallback(async () => {
    try {
      if (typeof window.Excel === "undefined") return;
      await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        sheets.load("items/name");
        await context.sync();

        const mdSheet = sheets.items.find(
          (s) => s.name.toLowerCase() === "cloud_backend_md"
        );
        if (!mdSheet) {
          setIsOutputSheet(false);
          return;
        }

        const ranges = {
          ModelName: mdSheet.getRange("B16"),
          ModelID: mdSheet.getRange("B18"),
          ModelType: mdSheet.getRange("B19"),
        };
        Object.values(ranges).forEach((r) => r.load("values"));
        await context.sync();

        const nameVal = ranges.ModelName.values[0][0] || "";
        const idVal = ranges.ModelID.values[0][0] || "";
        const typeVal = ranges.ModelType.values[0][0] || "";

        setHeading(`Save Scenario for: ${nameVal}`);
        setIsOutputSheet(true);
        setModelIDValue(idVal);
        setModelType(typeVal);

        if (typeVal === "AGGREGATOR") {
          setPageValue(
            "AggSaveScenario",
            "Loading scenario for Aggregator model..."
          );
        }
      });
    } catch (error) {
      console.error("Error checking for Outputs sheet:", error);
      setIsOutputSheet(false);
    }
  }, [setPageValue]);

  const fetchDataFromLambda = useCallback(async () => {
    try {
      const resp = await AWSconnections.FetchMetaData(
        "FETCH_METADATA",
        localStorage.getItem("idToken"),
        CONFIG.AWS_SECRETS_NAME,
        localStorage.getItem("User_ID"),
        localStorage.getItem("username")
      );
      if (!resp || !resp.results1 || !resp.results2 || !resp.result3) {
        throw new Error("Missing required results.");
      }
      setDataFrames({
        dfResult1: new DataFrame(resp.results1),
        dfResult2: new DataFrame(resp.results2),
        dfResult3: new DataFrame(resp.result3),
      });
    } catch (error) {
      console.error("Error fetching data from Lambda:", error);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          checkofCloudBackendSheet(),
          fetchDataFromLambda(),
        ]);
      } catch (e) {
        console.error("Initialization failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [checkofCloudBackendSheet, fetchDataFromLambda]);

  useEffect(() => {
    if (!loading && modelIDValue && dataFrames.dfResult3) {
      const authorized = dataFrames.dfResult3
        .toCollection()
        .some((m) => m.model_id === modelIDValue);
      if (!authorized) setIsOutputSheet(false);
    }
  }, [loading, modelIDValue, dataFrames.dfResult3]);

  // --- date helpers ---
  function excelSerialToJSDate(serial) {
    const epoch = new Date(1899, 11, 30);
    return new Date(epoch.getTime() + serial * 24 * 60 * 60 * 1000);
  }
  function formatToMMMYY(date) {
    const opts = { month: "short", year: "2-digit" };
    return new Intl.DateTimeFormat("en-US", opts)
      .format(date)
      .replace(" ", "-");
  }

  // --- render ---
  return (
    <Container>
      {loading ? (
        <MessageBox>Checking cloud compatibility, please wait...</MessageBox>
      ) : isOutputSheet ? (
        <>
          <Heading>{heading}</Heading>
          <DropdownContainer>
            <Input
              type="text"
              placeholder="Enter Scenario Name"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
            />
          </DropdownContainer>
          <SaveButton
            onClick={handleInitialClick}
            disabled={!scenarioName}
          >
            Save
          </SaveButton>

          {showConfirm && (
            <Overlay>
              <Modal>
                <ModalHeader>Submit Actuals?</ModalHeader>
                <ModalBody>
                  Do you want to submit actuals for cycle “{actualsCycle}” and
                  scenario “{scenarioName}”?
                </ModalBody>
                <ModalFooter>
                  <Button onClick={handleConfirm}>Yes</Button>
                  <Button onClick={handleCancel}>No</Button>
                </ModalFooter>
              </Modal>
            </Overlay>
          )}
        </>
      ) : (
        <MessageBox>
          No authorized model detected, please refresh the add-in
        </MessageBox>
      )}
    </Container>
  );
};

export default SaveScenarioActuals;
