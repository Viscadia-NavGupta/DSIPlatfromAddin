import React, { useState, useEffect } from "react";
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

function App() {
  const [page, setPage] = useState("UserLogin"); // Default page
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Login status
  const [userName, setUserName] = useState(""); // User's full name
  const [loadingMessage, setLoadingMessage] = useState("Processing request..."); // 🔹 Dynamic loading message
  const [saveForecastMessage, setSaveForecastMessage] = useState("Forecast is saved");

  /**
   * Handles user login authentication with AWS Cognito.
   * 
   
   */

  const login = async (username, password) => {
    try {
      console.log("Attempting login for:", username);
      const response = await AWSConnections.AwsLogin(username, password);
      if (response.AuthenticationResult) {
        localStorage.setItem("username", username);
        localStorage.setItem("password", password);
        localStorage.setItem("accessToken", response.AuthenticationResult.AccessToken);
        localStorage.setItem("idToken", response.AuthenticationResult.IdToken);
        localStorage.setItem("refreshToken", response.AuthenticationResult.RefreshToken);

        console.log("Login successful!");

        let firstName = localStorage.getItem("firstName");
        let lastName = localStorage.getItem("lastName");

        if (!firstName || !lastName) {
          console.log("Fetching user metadata...");
          const metadata = await AWSConnections.AuthorizationData(
            "LOGIN",
            response.AuthenticationResult.IdToken,
            "dsivis-dev-remaining-secrets",
            username
          );

          if (metadata.first_name && metadata.last_name) {
            firstName = metadata.first_name;
            lastName = metadata.last_name;
            const user_id = metadata.user_id || null;

            localStorage.setItem("firstName", firstName);
            localStorage.setItem("lastName", lastName);
            if (user_id) localStorage.setItem("User_ID", user_id);
          } else {
            console.warn("Metadata missing first_name, last_name, or user_id.");
          }
        }

        setUserName(`${firstName || ""} ${lastName || ""}`.trim());
        setIsLoggedIn(true);
        setPage("Home");
        return true;
      } else {
        console.error("Login failed: Invalid response.");
        return false;
      }
    } catch (error) {
      console.error("Error during login:", error);
      return false;
    }
  };

  /**
   * Initializes the user session by checking local storage.
   */
  useEffect(() => {
    const initializeSession = async () => {
      console.log("Initializing session...");
      const storedUsername = localStorage.getItem("username");
      const storedToken = localStorage.getItem("accessToken");

      if (storedUsername && storedToken) {
        console.log("User already logged in:", storedUsername);
        setIsLoggedIn(true);
        setPage("Home");

        const storedFirstName = localStorage.getItem("firstName");
        const storedLastName = localStorage.getItem("lastName");

        if (storedFirstName && storedLastName) {
          setUserName(`${storedFirstName} ${storedLastName}`.trim());
        }
      } else {
        console.warn("User not logged in. Redirecting to login page.");
        localStorage.clear();
        setIsLoggedIn(false);
        setPage("UserLogin");
      }
    };

    initializeSession();
  }, []);

  /**
   * Handles page navigation.
   */
  const setPageValue = (value, message = "Processing request...") => {
    if (value === "LoadingCircleComponent") {
      setLoadingMessage(message);
    } else if (value === "SaveForecastPageinterim") {
      setSaveForecastMessage(message);
    }
    setPage(value);
  };
  /**
   * Handles login and authentication.
   */
  const handleLogin = async (username, password) => {
    const isAuthenticated = await login(username, password);
    if (!isAuthenticated) {
      alert("Login failed. Please check your username and password.");
    }
  };

  /**
   * Handles user logout.
   */
  const handleLogout = () => {
    console.log("Logging out...");
    localStorage.clear();
    setIsLoggedIn(false);
    setPage("UserLogin");
  };

  /**
   * Determines if MainLayout should be used.
   */
  const shouldUseMainLayout = !["UserLogin", "ForgotPassword", "ContactUs", "SubmitPage"].includes(page);

  /**
   * Renders the correct page based on current state.
   */
  const renderPage = () => {
    switch (page) {
      case "Home":
        return <Home userName={userName} setPageValue={setPageValue} />;
      case "UserLogin":
        return <UserLogin setPageValue={setPageValue} handleLogin={handleLogin} />;
      case "ForgotPassword":
        return <ForgotPassword setPageValue={setPageValue} />;
      case "ContactUs":
        return <ContactUs setPageValue={setPageValue} />;
      case "SubmitPage":
        return <SubmitPage setPageValue={setPageValue} />;
      case "ForecastManagement":
        return <ForecastManagementPage setPageValue={setPageValue} onBack={() => setPageValue("Home")} />;
      case "AssumptionsCatalogue":
        return <AssumptionsCataloguePage onBack={() => setPageValue("Home")} />;
      case "InactiveFeature":
        return <InactiveFeature onBack={() => setPageValue("Home")} />;
      case "SaveForecastPage":
        return <SaveForecastPage setPageValue={setPageValue} />;
      case "SaveForecastPageinterim":
        return <SaveForecastPageinterim setPageValue={setPageValue} message={saveForecastMessage} />;
      case "LoadingCircleComponent":
        return <LoadingCircleComponent message={loadingMessage} />;
      case "LoadScenario":
        return <LoadScenario setPageValue={setPageValue} />;
      default:
        return <Home userName={userName} setPageValue={setPageValue} />;
    }
  };

  return (
    <div>
      {shouldUseMainLayout ? (
        <MainLayout setPageValue={setPageValue} currentPage={page} handleLogout={handleLogout}>
          {renderPage()}
        </MainLayout>
      ) : (
        renderPage()
      )}
    </div>
  );
}

export default App;
