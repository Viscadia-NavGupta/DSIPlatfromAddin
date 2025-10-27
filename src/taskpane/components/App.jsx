// src/App.js
import React, { useState, useEffect } from "react";
import CONFIG from "./Middleware/AWSConnections";
import UserLogin from "./LoginPage/UserLogin";
import ForgotPassword from "./ForgotPasswordPage/ForgotPasswordPage";
import ContactUs from "./ContactUs/ContactUs";
import SubmitPage from "./SubmitPage/SubmitPage";
import MainLayout from "./MainLayout/MainLayout";
import Home from "./MainUIPages/HomePage";
import ForecastManagementPage from "./MainUIPages/ForecastManagementPage/ForecastManagementPage";
import AssumptionsCataloguePage from "./MainUIPages/AssumptionsCataloguePage/AssumptionsCataloguePage";
import * as AWSConnections from "./Middleware/AWSConnections";
import InactiveFeature from "./InActivePAge/InactiveFeature";
import SaveForecastPage from "./MainUIPages/SaveScenario/SaveForecastPage";
import SaveForecastPageinterim from "./MainUIPages/MiscPages/SaveForecastPage";
import LoadingCircleComponent from "./MainUIPages/MiscPages/LoadingCircle";
import LoadScenario from "./MainUIPages/LoadScenarioPage/LoadScenario";
import SaveandLockScenario from "./MainUIPages/Save and Lock/SaveandLockPage";
import AggSaveScenario from "./MainUIPages/SaveScenario/SaveForecastPageAgg";
import AGGForecastManagementPage from "./MainUIPages/ForecastManagementPage/AGGForecastManagementPage";
import SaveScenarioActuals from "./MainUIPages/Save Actuals/saveactuals";
import AggLockScenario from "./MainUIPages/Save and Lock/SaveandLockPageAgg";
import ForecastLibrarypage from "./MainUIPages/Forecast Library/ForecastLibrarypage";
import FLSyncData from "./MainUIPages/Forecast Library/SyncdataDropdown";
import PasswordResetSuccess from "./ForgotPasswordPage/PasswordResetSuccess";
import ResetPassword from "./ForgotPasswordPage/ResetPassword";
import LoadScenarioAgg from "./MainUIPages/LoadScenarioPage/LoadSceanrioAgg";
import PowerbiManegment from "./MainUIPages/PowerBi Page/PowerBIPage";
import SuccessMessagePage from "./MainUIPages/MiscPages/successMessagePage";
import ModelManagementPage1 from "./MainUIPages/ModelBuilder/Modelbuilder";
import MMSheetManagment from "./MainUIPages/Model Desinger/ModelDesigner";
import DetailedNotesPage from "./MainUIPages/SaveScenario/DetailedNotesPage";
function App() {
  const [page, setPage] = useState("UserLogin");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("Processing request...");
  const [saveForecastMessage, setSaveForecastMessage] = useState("Forecast is saved");
  const [resetEmail, setResetEmail] = useState("");
  
  // Detailed Notes states for SaveForecastPage and DetailedNotesPage
  const [epidemiologyNotes, setEpidemiologyNotes] = useState("");
  const [marketShareNotes, setMarketShareNotes] = useState("");
  const [patientConversionNotes, setPatientConversionNotes] = useState("");
  const [demandConversionNotes, setDemandConversionNotes] = useState("");
  const [revenueConversionNotes, setRevenueConversionNotes] = useState("");

  // Unified page switcher
  const setPageValue = (value, message = "Processing request...") => {
    if (value === "LoadingCircleComponent") {
      setLoadingMessage(message);
    } else if (value === "SaveForecastPageinterim" || value === "SuccessMessagePage") {
      setSaveForecastMessage(message);
    }
    setPage(value);
  };

  // Login with loading spinner first, then AWS call
  const login = async (username, password) => {
    try {
      setErrorMessage("");
      setPageValue("LoadingCircleComponent", "Logging in...");

      const response = await AWSConnections.AwsLogin(username, password);
      if (!response.AuthenticationResult) {
        setErrorMessage("Login failed. Please check your username and password.");
        setPageValue("UserLogin");
        return false;
      }

      // success path
      localStorage.setItem("username", username);
      localStorage.setItem("accessToken", response.AuthenticationResult.AccessToken);
      localStorage.setItem("idToken", response.AuthenticationResult.IdToken);
      localStorage.setItem("refreshToken", response.AuthenticationResult.RefreshToken);

      setIsLoggedIn(true);
      setPage("Home");

      // background tasks
      Promise.all([
        (async () => {
          const f = localStorage.getItem("firstName"),
            l = localStorage.getItem("lastName");
          if (f && l) {
            setUserName(`${f} ${l}`.trim());
            return;
          }
          try {
            const decoded = await AWSConnections.decodeJwt(response.AuthenticationResult.IdToken);
            const first = decoded.name || "",
              last = decoded.family_name || "";
            localStorage.setItem("firstName", first);
            localStorage.setItem("lastName", last);
            setUserName(`${first} ${last}`.trim());
          } catch (e) {
            console.warn("Token decode error:", e);
          }
        })(),
        (async () => {
          // nothing extra needed here now
        })(),
        (async () => {
          try {
            const meta = await AWSConnections.AuthorizationData(
              "LOGIN",
              response.AuthenticationResult.IdToken,
              CONFIG.AWS_SECRETS_NAME,
              username
            );
            if (meta?.user_id) {
              localStorage.setItem("User_ID", meta.user_id);
            }
          } catch (e) {
            console.warn("Metadata fetch error:", e);
          }
        })(),
      ]).catch((e) => console.warn("Background error:", e));

      return true;
    } catch (error) {
      console.error("Error during login:", error);
      setErrorMessage("An error occurred. Please try again.");
      setPageValue("UserLogin");
      return false;
    }
  };

  const handleLogin = (username, password) => login(username, password);

  // Session initializer with refresh-token check and loading spinner
  useEffect(() => {
    (async () => {
      const username = localStorage.getItem("username");
      const refreshToken = localStorage.getItem("refreshToken");

      if (!username || !refreshToken) {
        localStorage.clear();
        setIsLoggedIn(false);
        setPage("UserLogin");
        return;
      }

      // show loading spinner while refreshing
      setPageValue("LoadingCircleComponent", "Refreshing session...");

      try {
        // Attempt to refresh tokens
        await AWSConnections.AWSrefreshtoken();

        // on success, go to home
        setIsLoggedIn(true);
        setPage("Home");

        const f = localStorage.getItem("firstName"),
          l = localStorage.getItem("lastName");
        if (f && l) setUserName(`${f} ${l}`.trim());
      } catch (err) {
        const msg = err.message || "";
        if (
          msg.includes("NotAuthorizedException") ||
          msg.includes("Invalid Refresh Token")
        ) {
          console.warn("🔒 Refresh token invalid:", msg);
        } else {
          console.error("🔄 Refresh error:", err);
        }
        localStorage.clear();
        setIsLoggedIn(false);
        setPage("UserLogin");
      }
    })();
  }, []); // run once on mount

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setPage("UserLogin");
  };

  const noLayoutPages = [
    "UserLogin",
    "ForgotPassword",
    "ContactUs",
    "SubmitPage",
    "ResetPassword",
    "PasswordResetSuccess",
  ];
  const shouldUseMainLayout = !noLayoutPages.includes(page);

  const renderPage = () => {
    switch (page) {
      case "Home":
        return <Home userName={userName} setPageValue={setPageValue} />;
      case "UserLogin":
        return (
          <UserLogin
            setPageValue={setPageValue}
            handleLogin={handleLogin}
            errorMessage={errorMessage}
            setErrorMessage={setErrorMessage}
          />
        );
      case "ForgotPassword":
        return (
          <ForgotPassword
            setPageValue={setPageValue}
            setResetEmail={setResetEmail}
          />
        );
      case "ContactUs":
        return <ContactUs setPageValue={setPageValue} />;
      case "SubmitPage":
        return <SubmitPage setPageValue={setPageValue} />;
      case "ForecastManagement":
        return (
          <ForecastManagementPage
            setPageValue={setPageValue}
            onBack={() => setPageValue("Home")}
          />
        );
      case "AssumptionsCatalogue":
        return <AssumptionsCataloguePage onBack={() => setPageValue("Home")} />;
      case "InactiveFeature":
        return <InactiveFeature onBack={() => setPageValue("Home")} />;
      case "SaveForecastPage":
        return (
          <SaveForecastPage 
            setPageValue={setPageValue}
            epidemiologyNotes={epidemiologyNotes}
            setEpidemiologyNotes={setEpidemiologyNotes}
            marketShareNotes={marketShareNotes}
            setMarketShareNotes={setMarketShareNotes}
            patientConversionNotes={patientConversionNotes}
            setPatientConversionNotes={setPatientConversionNotes}
            demandConversionNotes={demandConversionNotes}
            setDemandConversionNotes={setDemandConversionNotes}
            revenueConversionNotes={revenueConversionNotes}
            setRevenueConversionNotes={setRevenueConversionNotes}
          />
        );
      case "SaveForecastPageinterim":
        return (
          <SaveForecastPageinterim
            setPageValue={setPageValue}
            message={saveForecastMessage}
          />
        );
      case "LoadingCircleComponent":
        return <LoadingCircleComponent message={loadingMessage} />;
      case "LoadScenario":
        return <LoadScenario setPageValue={setPageValue} />;
      case "SaveandLockScenario":
        return <SaveandLockScenario setPageValue={setPageValue} />;
      case "AggLockScenario":
        return <AggLockScenario setPageValue={setPageValue} />;
      case "AggSaveScenario":
        return <AggSaveScenario setPageValue={setPageValue} />;
      case "SaveScenarioActuals":
        return <SaveScenarioActuals setPageValue={setPageValue} />;
      case "ForecastLibrarypage":
        return <ForecastLibrarypage setPageValue={setPageValue} />;
      case "FLSyncData":
        return <FLSyncData setPageValue={setPageValue} />;
      case "PasswordResetSuccess":
        return <PasswordResetSuccess setPageValue={setPageValue} />;
      case "LoadScenarioAgg":
        return <LoadScenarioAgg setPageValue={setPageValue} />;
      case "PowerbiManegment":
        return <PowerbiManegment setPageValue={setPageValue} />;
      case "ModelManagementPage1":
        return <ModelManagementPage1 setPageValue={setPageValue} />;
      case "MMSheetManagment":
        return <MMSheetManagment setPageValue={setPageValue} />;
      case "SuccessMessagePage":
        return (
          <SuccessMessagePage
            setPageValue={setPageValue}
            message={saveForecastMessage}
          />
        );
      case "ResetPassword":
        return (
          <ResetPassword
            setPageValue={setPageValue}
            email={resetEmail}
          />
        );
      case "AGGForecastManagementPage":
        return (
          <AGGForecastManagementPage
            setPageValue={setPageValue}
            onBack={() => setPageValue("Home")}
          />
        );
      case "DetailedNotesPage":
        return (
          <DetailedNotesPage
            setPageValue={setPageValue}
            epidemiologyNotes={epidemiologyNotes}
            setEpidemiologyNotes={setEpidemiologyNotes}
            marketShareNotes={marketShareNotes}
            setMarketShareNotes={setMarketShareNotes}
            patientConversionNotes={patientConversionNotes}
            setPatientConversionNotes={setPatientConversionNotes}
            demandConversionNotes={demandConversionNotes}
            setDemandConversionNotes={setDemandConversionNotes}
            revenueConversionNotes={revenueConversionNotes}
            setRevenueConversionNotes={setRevenueConversionNotes}
          />
        );
      default:
        return <Home userName={userName} setPageValue={setPageValue} />;
    }
  };

  return shouldUseMainLayout ? (
    <MainLayout
      setPageValue={setPageValue}
      currentPage={page}
      handleLogout={handleLogout}
    >
      {renderPage()}
    </MainLayout>
  ) : (
    renderPage()
  );
}

export default App;
