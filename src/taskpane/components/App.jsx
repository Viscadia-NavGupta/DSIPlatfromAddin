// app.js
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
import SaveandLockScenario from "./MainUIPages/Save and Lock/SaveandLockPage";
import AggSaveScenario from "./MainUIPages/SaveScenario/SaveForecastPageAgg";
import AGGForecastManagementPage from "./MainUIPages/ForecastManagementPage/AGGForecastManagementPage";
import SaveScenarioActuals from "./MainUIPages/Save Actuals/saveactuals";
import AggLockScenario from "./MainUIPages/Save and Lock/SaveandLockPageAgg";

function App() {
  const [page, setPage] = useState("UserLogin"); // Default page
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Login status
  const [userName, setUserName] = useState(""); // User's full name
  const [loadingMessage, setLoadingMessage] = useState("Processing request...");
  const [saveForecastMessage, setSaveForecastMessage] = useState("Forecast is saved");

  /**
   * Handles user login authentication with AWS Cognito.
   * Optimized for performance with parallel operations.
   */
  const login = async (username, password) => {
    try {
      console.log("Attempting login for:", username);
      setPageValue("LoadingCircleComponent", "Logging in...");

      const response = await AWSConnections.AwsLogin(username, password);
      if (!response.AuthenticationResult) {
        console.error("Login failed: Invalid response.");
        setPageValue("UserLogin");
        return false;
      }

      // Store critical tokens and update UI immediately
      localStorage.setItem("username", username);
      localStorage.setItem("accessToken", response.AuthenticationResult.AccessToken);
      localStorage.setItem("idToken", response.AuthenticationResult.IdToken);

      // Update UI state immediately to improve perceived performance
      setIsLoggedIn(true);
      setPage("Home");

      // Run these operations in parallel to improve performance
      Promise.all([
        // Only decode token if needed
        (async () => {
          const storedFirstName = localStorage.getItem("firstName");
          const storedLastName = localStorage.getItem("lastName");

          if (storedFirstName && storedLastName) {
            setUserName(`${storedFirstName} ${storedLastName}`.trim());
            return;
          }

          try {
            const decodedToken = await AWSConnections.decodeJwt(response.AuthenticationResult.IdToken);
            const firstName = decodedToken.name || "";
            const lastName = decodedToken.family_name || "";

            localStorage.setItem("firstName", firstName);
            localStorage.setItem("lastName", lastName);
            setUserName(`${firstName} ${lastName}`.trim());
          } catch (e) {
            console.warn("Token decode error:", e);
          }
        })(),

        // Store non-critical data
        (async () => {
          localStorage.setItem("password", password);
          localStorage.setItem("refreshToken", response.AuthenticationResult.RefreshToken);
        })(),

        // Fetch additional user metadata in background
        (async () => {
          try {
            const metadata = await AWSConnections.AuthorizationData(
              "LOGIN",
              response.AuthenticationResult.IdToken,
              "DSI-prod-remaining-secrets",
              username
            );

            if (metadata && metadata.user_id) {
              localStorage.setItem("User_ID", metadata.user_id);
            }
          } catch (e) {
            console.warn("Error fetching user metadata:", e);
            // Non-critical error - login can still proceed
          }
        })(),
      ]).catch((err) => {
        console.warn("Background processes error:", err);
        // Non-critical error - user is already logged in
      });

      return true;
    } catch (error) {
      console.error("Error during login:", error);
      setPageValue("UserLogin");
      return false;
    }
  };

  /**
   * Initializes the user session by checking local storage.
   * Optimized for faster startup time.
   */
  useEffect(() => {
    const initializeSession = async () => {
      console.log("Initializing session...");

      // Check only essential tokens first
      const storedUsername = localStorage.getItem("username");
      const storedToken = localStorage.getItem("accessToken");

      if (!storedUsername || !storedToken) {
        console.warn("User not logged in. Redirecting to login page.");
        localStorage.clear();
        setIsLoggedIn(false);
        setPage("UserLogin");
        return;
      }

      // Fast path: Update UI immediately
      console.log("User already logged in:", storedUsername);
      setIsLoggedIn(true);
      setPage("Home");

      // Set user name from storage if available
      const storedFirstName = localStorage.getItem("firstName");
      const storedLastName = localStorage.getItem("lastName");

      if (storedFirstName && storedLastName) {
        setUserName(`${storedFirstName} ${storedLastName}`.trim());
      }

      // Optional: Validate token in background to ensure it's not expired
      (async () => {
        try {
          // You could implement a token validation here
          // If token is invalid, redirect to login
          // const isValid = await AWSConnections.validateToken(storedToken);
          // if (!isValid) { handleLogout(); }
        } catch (e) {
          console.warn("Token validation error:", e);
        }
      })();
    };

    initializeSession();
  }, []);

  /**
   * Handles page navigation and updating loading or save messages.
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
   * Renders the appropriate page based on the current state.
   * Using React.lazy could further improve performance here.
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
      case "SaveandLockScenario":
        return <SaveandLockScenario setPageValue={setPageValue} />;
      case "AggLockScenario":
        return <AggLockScenario setPageValue={setPageValue} />;
      case "AggSaveScenario":
        return <AggSaveScenario setPageValue={setPageValue} />;
      case "SaveScenarioActuals":
        return <SaveScenarioActuals setPageValue={setPageValue} />;
      case "AGGForecastManagementPage":
        return <AGGForecastManagementPage setPageValue={setPageValue} onBack={() => setPageValue("Home")} />;
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
