import { v4 as uuidv4 } from "uuid"; // UUID Generator for request tracking
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import * as Excelconnections from "./ExcelConnection";

// =============================================================================
//                         CONFIGURATION CONSTANTS
// =============================================================================
const ENV = "prod"; // Change to "prod" to switch environments

const CONFIG = {
  dev: {
    COGNITO: {
      URL: "https://cognito-idp.us-east-1.amazonaws.com/",
      CLIENT_ID: "47ht7bakkhf3k89enj23581vcd",
    },
    AUTH_URL: "https://tj67lue8y7.execute-api.us-east-1.amazonaws.com/dev/sqldbquery",
    AWS_SECRETS_NAME: "dsivis-dev-remaining-secret",
    POLLING: {
      MAX_ATTEMPTS: 100,
      DELAY_MS: 5000,
    },
    UPLOAD: {
      CHUNK_SIZE: 50000,
      COMPRESSION_LEVEL: 4,
    },
  },
  prod: {
    COGNITO: {
      URL: "https://cognito-idp.us-east-2.amazonaws.com/",
      CLIENT_ID: "5d9qolco5mqc2bm9o5jjpe78la",
    },
    AUTH_URL: "https://29xxlo1ehl.execute-api.us-east-2.amazonaws.com/prod/sqldbquery",
    AWS_SECRETS_NAME: "DSI-prod-remaining-secrets",
    POLLING: {
      MAX_ATTEMPTS: 100,
      DELAY_MS: 5000,
    },
    UPLOAD: {
      CHUNK_SIZE: 100000,
      COMPRESSION_LEVEL: 4,
    },
  },
}[ENV];
export default CONFIG;

// Simple in-memory cache for AWS metadata (to avoid repeated calls)
let awsMetadataCache = {
  data: null,
  timestamp: 0,
};

// =============================================================================
//                 AUTHENTICATION & TOKEN MANAGEMENT
// =============================================================================

/**
 * Authenticates a user with AWS Cognito.
 * @param {string} username - The user's username.
 * @param {string} password - The user's password.
 * @returns {Promise<object>} - Authentication response data.
 */
export async function AwsLogin(username, password) {
  const headers = {
    "Content-Type": "application/x-amz-json-1.1",
    "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
    Connection: "keep-alive",
  };

  const body = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: CONFIG.COGNITO.CLIENT_ID,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  };

  try {
    const response = await fetch(CONFIG.COGNITO.URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }
    const data = await response.json();
    console.log("✅ Login successful");
    return data;
  } catch (error) {
    console.error("🚨 Authentication error:", error);
    throw error;
  }
}

/**
 * Refreshes the AWS Cognito token.
 * @returns {Promise<object>} - Token refresh response data.
 */
export async function AWSrefreshtoken() {
  const refreshToken = localStorage.getItem("refreshToken");

  if (!refreshToken) {
    console.error("❌ No refresh token found in localStorage.");
    return;
  }

  const headers = {
    "Content-Type": "application/x-amz-json-1.1",
    "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
    Connection: "keep-alive",
  };

  const body = JSON.stringify({
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: CONFIG.COGNITO.CLIENT_ID,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  });

  try {
    console.log("🔄 Attempting to refresh tokens...");

    const response = await fetch(CONFIG.COGNITO.URL, {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`❌ Token refresh failed with status ${response.status}`);
    }

    const responseData = await response.json();
    const authResult = responseData?.AuthenticationResult;

    if (authResult?.IdToken) {
      // Save tokens and expiry time
      localStorage.setItem("idToken", authResult.IdToken);
      if (authResult.AccessToken) {
        localStorage.setItem("accessToken", authResult.AccessToken);
      }
      if (authResult.ExpiresIn) {
        const expiryTime = Date.now() + authResult.ExpiresIn * 1000;
        localStorage.setItem("tokenExpiry", expiryTime.toString());
      }

      console.log("✅ ID token refreshed and saved to localStorage.");
    } else {
      console.error("❌ No ID token found in the refresh response.");
    }

    return authResult;
  } catch (error) {
    console.error("🚨 Error during token refresh:", error);
    throw error;
  }
}

/**
 * Decodes a JWT token.
 * @param {string} token - The JWT token.
 * @returns {Promise<object>} - The decoded token payload.
 */
export async function decodeJwt(token) {
  if (!token) throw new Error("Invalid token provided");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT token format");
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
  return JSON.parse(jsonPayload);
}

// =============================================================================
//                  AUTHORIZATION & METADATA FUNCTIONS
// =============================================================================

/**
 * Fetches authorization data or performs authorized actions.
 * @param {string} buttonname - Action to perform.
 * @param {string} idToken - JWT ID token.
 * @param {string} secretName - AWS secrets name.
 * @param {string} emailId - User's email ID.
 * @param {Array<string>} UUID - Optional UUIDs for resource identification.
 * @returns {Promise<object>} - Authorization response data.
 */
export async function AuthorizationData(buttonname, idToken, secretName, emailId, UUID = []) {
  const headers = {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json",
    // Connection: "keep-alive",
  };

  const body = {
    action: buttonname,
    secret_name: secretName,
    email_id: emailId,
    UUID,
  };

  try {
    let response = await fetch(CONFIG.AUTH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    let data = await response.json();

    // Handle token expiration
    if (data?.message === "The incoming token has expired") {
      console.warn("🔄 Token expired! Refreshing...");
      await AWSrefreshtoken();
      const refreshedToken = localStorage.getItem("idToken");
      response = await fetch(CONFIG.AUTH_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${refreshedToken}`,
          "Content-Type": "application/json",
          Connection: "keep-alive",
        },
        body: JSON.stringify(body),
      });
      data = await response.json();
    }

    console.log("✅ Authorization data retrieved");
    return data;
  } catch (error) {
    console.error("🚨 Authorization error:", error);
    // Return error instead of throwing
    return { status: 'error', message: error.message || String(error) };
  }
}

/**
 * Retrieves AWS metadata (secrets) using caching to avoid redundant calls.
 * @param {string} idToken - JWT ID token.
 * @param {string} email - User email.
 * @returns {Promise<object>} - AWS metadata.
 */
async function getAWSMetadata(idToken, email) {
  // Cache duration: 5 minutes
  if (awsMetadataCache.data && Date.now() - awsMetadataCache.timestamp < 5 * 60 * 1000) {
    console.log("Using cached AWS metadata");
    return awsMetadataCache.data;
  }
  const data = await AuthorizationData("FETCH_METADATA", idToken, CONFIG.AWS_SECRETS_NAME, email);
  awsMetadataCache.data = data;
  awsMetadataCache.timestamp = Date.now();
  return data;
}

/**
 * Fetches metadata (secrets) from AWS.
 * @param {string} buttonName - Action to perform.
 * @param {string} idToken - JWT ID token.
 * @param {string} secretName - AWS secrets name.
 * @param {string} userId - User ID.
 * @param {string} email_id - User's email ID.
 * @returns {Promise<object>} - Metadata response data.
 */
export async function FetchMetaData(buttonName, idToken, secretName, userId, email_id) {
  try {
    console.log("🔍 Fetching secrets from AWS...");

    let AWSsecrets = await getAWSMetadata(idToken, email_id);

    // 🔹 Check if secrets exist, otherwise trigger token refresh
    if (!AWSsecrets.results || !AWSsecrets.results[CONFIG.AWS_SECRETS_NAME]) {
      console.warn("⚠️ Token may be expired. Refreshing token...");
      await AWSrefreshtoken();
      const refreshedToken = localStorage.getItem("idToken");

      // Retry fetching metadata with refreshed token
      AWSsecrets = await getAWSMetadata(refreshedToken, email_id);

      if (!AWSsecrets.results || !AWSsecrets.results[CONFIG.AWS_SECRETS_NAME]) {
        throw new Error("❌ Missing secrets in AWS response after token refresh.");
      }
    }

    const secretsObject = AWSsecrets.results[CONFIG.AWS_SECRETS_NAME];
    if (!secretsObject.ServOrch) {
      throw new Error("❌ Missing Service Orchestration URL");
    }
    const ServOrchURL = secretsObject.ServOrch;
    console.log("✅ Service Orchestration URL retrieved");

    userId = AWSsecrets.user_id;

    const UUID_Generated = uuidv4();
    const headers = {
      Authorization: `Bearer ${idToken}`, // Use the refreshed token if applicable
      "Content-Type": "application/json",
    };
    const body = JSON.stringify({
      uuid: UUID_Generated,
      buttonName,
      secret_name: secretName,
      user_id: userId,
    });

    let response = await fetch(ServOrchURL, {
      method: "POST",
      headers,
      body,
    });

    // 🔹 Handle expired token case
    if (response.status === 401 || response.status === 403) {
      console.warn("🔄 Token expired. Refreshing and retrying...");
      await AWSrefreshtoken();
      const refreshedToken = localStorage.getItem("idToken");

      headers.Authorization = `Bearer ${refreshedToken}`;
      response = await fetch(ServOrchURL, {
        method: "POST",
        headers,
        body,
      });

      if (!response.ok) {
        throw new Error(`❌ Metadata request failed after refresh: ${response.status}`);
      }
    }

    const data = await response.json();
    console.log("✅ Metadata retrieved successfully");
    return data;
  } catch (error) {
    console.error("🚨 Metadata fetch error:", error.message);
    throw error;
  }
}

// =============================================================================
//                     SERVICE REQUEST FUNCTIONS
// =============================================================================

/**
 * Makes a service request to AWS.
 * @param {string} serviceURL - Service endpoint URL.
 * @param {string} buttonName - Action to perform.
 * @param {string} UUID - Request UUID.
 * @param {string} Model_UUID - Model UUID.
 * @param {string} idToken - JWT ID token.
 * @param {string} secretName - AWS secrets name.
 * @param {string} userId - User ID.
 * @param {string} cycleName - Cycle name.
 * @param {string} scenarioName - Scenario name.
 * @returns {Promise<string>} - Service response message.
 */
export async function servicerequest(
  serviceURL = "",
  buttonName = "",
  UUID = "",
  Model_UUID = "",
  idToken = "",
  secretName = "",
  userId = "",
  cycleName = "",
  scenarioName = "",
  constituent_ID = [],
  forecast_id = ""
) {
  try {
    const headers = {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
      Connection: "keep-alive",
    };
    const body = {
      request_id: UUID,
      buttonName,
      secret_name: secretName,
      user_id: userId,
      model_id: Model_UUID,
      cycle_name: cycleName,
      scenario_name: scenarioName,
      constituent_forecast_ids: constituent_ID,
      forecast_id: forecast_id,
    };

    console.log("📤 Sending service request");
    const response = await fetch(serviceURL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const data = await response.json();
    console.log("✅ Service response received");

    if (!response.ok) {
      return data.message || `HTTP Error ${response.status}`;
    }
    return data.message || "Success (no message provided)";
  } catch (error) {
    console.error("🚨 Service request error:", error);
    if (error.response) {
      try {
        const errorData = await error.response.json();
        return errorData.message || `Error: ${error.response.status}`;
      } catch {
        return `Error: ${error.response.status}`;
      }
    }
    return `Error: ${error.message}`;
  }
}

//  Extract Dashbaord data fro Forecast Library service request to AWS

export async function Extract_Service_Request(
  serviceURL = "",
  buttonName = "",
  UUID = "",
  idToken = "",
  secretName = "",
  userId = "",
  constituent_ID = [],
) {
  try {
    const headers = {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
      Connection: "keep-alive",
    };
    const body = {
      request_id: UUID,
      buttonName,
      secret_name: secretName,
      user_id: userId,
      forecast_id: constituent_ID,
    };
    console.log("📤 Sending service request");
    const response = await fetch(serviceURL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const data = await response.json();
    console.log("✅ Service response received");
    if (!response.ok) {
      return data.message || `HTTP Error ${response.status}`;
    }
    return data.message || "Success (no message provided)";
  } catch (error) {
    console.error("🚨 Service request error:", error);
    if (error.response) {
      try {
        const errorData = await error.response.json();
        return errorData.message || `Error: ${error.response.status}`;
      } catch {
        return `Error: ${error.response.status}`;
      }
    }
    return `Error: ${error.message}`;
  }
}

// - end of fiucntion 


// service request fro constituent id for load agg 
export async function ServiceRequest_Fetch_Constituent_ID(
  serviceURL = "",
  buttonName = "FETCH_AGG_CONSTITUENTS",
  UUID = "",
  idToken = "",
  secretName = "",
  userId = "",
  constituent_ID = "",
  Model_id,
) {
  try {
    const headers = {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
      Connection: "keep-alive",
    };
    const body = {
      request_id: UUID,
      buttonName,
      secret_name: secretName,
      user_id: userId,
      forecast_id: constituent_ID,
      model_id: Model_id,
    };
    console.log("📤 Sending service request");
    const response = await fetch(serviceURL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const data = await response.json();
    console.log("✅ Service response received");
    if (!response.ok) {
      return data.message || `HTTP Error ${response.status}`;
    }
    return data.constituent_forecast_ids || "Success (no message provided)";
  } catch (error) {
    console.error("🚨 Service request error:", error);
    if (error.response) {
      try {
        const errorData = await error.response.json();
        return errorData.message || `Error: ${error.response.status}`;
      } catch {
        return `Error: ${error.response.status}`;
      }
    }
    return `Error: ${error.message}`;
  }
}




// end of fucntion 



/**
 * Orchestrates service requests with file handling.
 * @param {string} buttonname - Action to perform.
 * @param {string} UUID - Request UUID.
 * @param {string} Model_UUID - Model UUID.
 * @param {string} scenarioname - Scenario name.
 * @param {string} cycleName - Cycle name.
 * @param {string} User_ID - User ID.
 * @param {string} secret_name - AWS secrets name.
 * @param {string} Forecast_UUID - Forecast UUID.
 * @param {Array} LongformData - Data array for forecast.
 * @returns {Promise<object>} - Service orchestration result.
 */
export async function service_orchestration(
  buttonname,
  UUID = "",
  Model_UUID = "",
  scenarioname = "",
  cycleName = "",
  User_ID = "",
  secret_name = "",
  Forecast_UUID = "",
  LongformData = [],
  outputbackend_data = [],
  sheetNames_Agg = [],
  constituent_ID = [],
  matchedForecasts = [],
  setPageValue,
  ForecastIDS = [],
  constituent_ID_SaveStatus = []
) {
  console.log(`🚀 Service orchestration started: ${buttonname}`);

  try {
    const username = localStorage.getItem("username");
    const idToken = localStorage.getItem("idToken");
    const User_Id = parseInt(localStorage.getItem("User_ID"), 10);

    // fetch AWS secrets from meta data 

    let AWSsecrets = await AuthorizationData("FETCH_METADATA", idToken, CONFIG.AWS_SECRETS_NAME, username);
    if (AWSsecrets?.message === "The incoming token has expired") {
      console.warn("🔄 Token expired, refreshing...");
      await AWSrefreshtoken();
      AWSsecrets = await AuthorizationData("FETCH_METADATA", idToken, CONFIG.AWS_SECRETS_NAME, username);

    }

    if (!AWSsecrets || !AWSsecrets.results) {
      throw new Error("❌ Failed to retrieve AWS secrets");
    }
    // create a new UUID for the request
    const UUID_Generated = [uuidv4()];
    const secretsObject = AWSsecrets.results[CONFIG.AWS_SECRETS_NAME];
    const serviceorg_URL = secretsObject.ServOrch;
    const pollingUrl = secretsObject.Polling;


    if (buttonname === "SAVE_FORECAST" || buttonname === "SAVE_LOCKED_FORECAST" || buttonname === "SAVE_SANDBOX") {
      console.log("📤 Preparing forecast upload");
      // save_forecast is used to get the s3 objects to upload the lifes 
      const S3Uploadobejct = await AuthorizationData(
        "SAVE_FORECAST",
        idToken,
        CONFIG.AWS_SECRETS_NAME,
        username,
        UUID_Generated
      );

      const UploadS3SaveForecastURL = S3Uploadobejct["presigned urls"]["UPLOAD"]["SAVE_FORECAST"][UUID_Generated[0]];
      const UploadS3INPUTFILEURL = S3Uploadobejct["presigned urls"]["UPLOAD"]["INPUT_FILE"][UUID_Generated[0]];
      const UploadOUTPUT_FILEURL = S3Uploadobejct["presigned urls"]["UPLOAD"]["OUTPUT_FILE"][UUID_Generated[0]];

      // horizontal format conversion 
      LongformData = await pivotUpFlatArrayToAC(LongformData);

      // uploading files to s3

      const [flag_flatfileupload, flat_inputfileupload, flag_outputbackend] = await Promise.all([
        uploadFileToS3FromArray(LongformData, "Test", UploadS3SaveForecastURL),
        uploadFileToS3("Input File", UploadS3INPUTFILEURL),
        uploadFileToS3FromArray(outputbackend_data, "Test", UploadOUTPUT_FILEURL),
      ]);

      console.log(
        `🟢 Uploads completed - Forecast: ${flag_flatfileupload}, Input: ${flat_inputfileupload}, output: ${flag_outputbackend}`
      );

      if (flag_flatfileupload || flat_inputfileupload) {
        const servicestatus = await servicerequest(
          serviceorg_URL,
          buttonname,
          UUID_Generated[0],
          Model_UUID,
          idToken,
          CONFIG.AWS_SECRETS_NAME,
          User_Id,
          cycleName,
          scenarioname
        );


        if (servicestatus === "Endpoint request timed out" || (servicestatus && servicestatus.status === "Poll")) {
          console.log("⏱️ Service request requires polling");
          return poll(UUID_Generated[0], CONFIG.AWS_SECRETS_NAME, pollingUrl, idToken);
        }
        return servicestatus;
      }
    }
    /// cahnge for save interim to snadbox 
    else if (buttonname === "SANDBOXED_TO_INTERIM_FORECAST") {
      console.log("📤 Preparing to lock sandboxed forecast");

      let servicestatus = await servicerequest(
        serviceorg_URL,
        buttonname,
        UUID_Generated[0],
        "",
        idToken,
        CONFIG.AWS_SECRETS_NAME,
        User_Id,
        "",
        "",
        [],
        [Forecast_UUID]
      );

      console.log("🔄 Service status:", servicestatus);

      // 2️⃣ Handle polling if necessary:
      if (
        servicestatus === "Endpoint request timed out" ||
        (servicestatus && servicestatus.status === "Poll")
      ) {
        return poll(UUID_Generated[0], CONFIG.AWS_SECRETS_NAME, pollingUrl, idToken);
      }
      return servicestatus;
      /// import and save the forecast
    } else if (buttonname === "IMPORT_ASSUMPTIONS") {
      const S3downloadobject = await AuthorizationData(
        buttonname,
        idToken,
        CONFIG.AWS_SECRETS_NAME,
        username,
        Forecast_UUID
      );

      const DownloadS3INPUTFILEURL = S3downloadobject["presigned urls"]["DOWNLOAD"]["INPUT_FILE"][Forecast_UUID[0]];
      const downloadResult = await downloadAndInsertDataFromExcel(DownloadS3INPUTFILEURL, "Input File");
      if (downloadResult.success === true) {
        return { status: "Scenario Imported" };
      }
      /// import and save the forecast
    } else if (buttonname === "SAVE_ACTUALS") {
      console.log("📤 Preparing Actuals upload");
      const S3Uploadobejct = await AuthorizationData(
        "SAVE_FORECAST",
        idToken,
        CONFIG.AWS_SECRETS_NAME,
        username,
        UUID_Generated
      );

      const UploadS3SaveForecastURL = S3Uploadobejct["presigned urls"]["UPLOAD"]["SAVE_FORECAST"][UUID_Generated[0]];
      LongformData = await pivotUpFlatArrayToAC(LongformData);

      const [flag_flatfileupload, flat_inputfileupload, flag_outputbackend] = await Promise.all([
        uploadFileToS3FromArray(LongformData, "Test", UploadS3SaveForecastURL),
      ]);

      console.log(`🟢 Uploads completed - Forecast: ${flag_flatfileupload}`);

      if (flag_flatfileupload || flat_inputfileupload) {
        const servicestatus = await servicerequest(
          serviceorg_URL,
          "SAVE_LOCKED_FORECAST",
          UUID_Generated[0],
          Model_UUID,
          idToken,
          CONFIG.AWS_SECRETS_NAME,
          User_Id,
          cycleName,
          scenarioname
        );

        if (servicestatus === "Endpoint request timed out" || (servicestatus && servicestatus.status === "Poll")) {
          console.log("⏱️ Service request requires polling");
          return poll(UUID_Generated[0], CONFIG.AWS_SECRETS_NAME, pollingUrl, idToken);
        }
        return servicestatus;

      }
    } else if (buttonname === "Agg_Load_Models") {
      console.log("📤 Preparing to load Aggregated Models");

      const S3downloadobject = await AuthorizationData(
        "IMPORT_ASSUMPTIONS",
        idToken,
        CONFIG.AWS_SECRETS_NAME,
        username,
        constituent_ID
      );

      const Downloadconstituent_ID_URL = S3downloadobject?.["presigned urls"]?.["DOWNLOAD"]?.["OUTPUT_FILE"];
      if (!Downloadconstituent_ID_URL) {
        console.error("❌ No download URLs received");
        return { status: "error", message: "No download URLs received" };
      }

      const keys = Object.keys(Downloadconstituent_ID_URL);
      const totalFiles = keys.length;

      if (totalFiles === 0) {
        console.warn("⚠️ No models found to download.");
        return { status: "warning", message: "No models to download." };
      }

      for (let i = 0; i < keys.length; i++) {
        const constituentID = keys[i];
        const url = Downloadconstituent_ID_URL[constituentID];
        const sheetName = sheetNames_Agg[i] || `Sheet_${i + 1}`; // Fallback name

        try {
          await AggDownloadS3(url, sheetName);
          const progress = Math.round(((i + 1) / totalFiles) * 100);
          setPageValue("LoadingCircleComponent", `${progress}% | Loading Models...`);
          console.log(`✅ Downloaded: ${sheetName}`);
        } catch (error) {
          console.error(`❌ Error downloading ${sheetName}:`, error);
          // Immediately return an error response
          return {
            status: "error",
            message: `Failed to download ${sheetName}: ${error.message}`
          };
        }
      }

      await writeArrayToNamedRange(constituent_ID, "Imported_model_List");

      console.log("✅ All downloads completed.");
      return { status: "SUCCESS", message: "Aggregated models downloaded." };
    } else if (buttonname === "SAVE_FORECAST_AGG" || buttonname === "SAVE_LOCKED_FORECAST_AGG" || buttonname === "SAVE_SANDBOX_AGG" || buttonname === "SANDBOXED_TO_INTERIM_FORECAST_AGG") {
      const buttonMapping = {
        SAVE_FORECAST_AGG: "SAVE_FORECAST",
        SAVE_LOCKED_FORECAST_AGG: "SAVE_LOCKED_FORECAST",
        SAVE_SANDBOX_AGG: "SAVE_SANDBOX",
        SANDBOXED_TO_INTERIM_FORECAST_AGG: "SANDBOXED_TO_INTERIM_FORECAST",
      };
      const mappedButtonName = buttonMapping[buttonname] || buttonname;


      if (mappedButtonName === "SANDBOXED_TO_INTERIM_FORECAST") {
        console.log("📤 Preparing to lock sandboxed forecast");

        // 1️⃣ Call the service
        const serviceStatus = await servicerequest(
          serviceorg_URL,
          mappedButtonName,
          UUID_Generated[0],
          "",
          idToken,
          CONFIG.AWS_SECRETS_NAME,
          User_Id,
          "",
          "",
          [],
          [Forecast_UUID]
        );
        console.log("🔄 Service status:", serviceStatus);

        // 2️⃣ Handle polling if necessary
        let pollingStatus;
        if (
          serviceStatus === "Endpoint request timed out" ||
          (serviceStatus && serviceStatus.status === "Poll")
        ) {
          const pollResponse = await poll(
            UUID_Generated[0],
            CONFIG.AWS_SECRETS_NAME,
            pollingUrl,
            idToken
          );
          console.log("🔄 Poll response:", pollResponse);
          pollingStatus = pollResponse.result ?? pollResponse;
        } else {
          pollingStatus =
            typeof serviceStatus === "string"
              ? serviceStatus
              : serviceStatus.status ?? serviceStatus;
        }

        // 3️⃣ If polling didn’t finish with DONE, exit immediately
        if (pollingStatus !== "DONE") {
          console.error(`❌ Lock‑sandbox‑to‑interim failed: ${pollingStatus}`);
          return {
            status: "error",
            message: `Lock‑sandbox‑to‑interim failed: ${pollingStatus}`
          };
        }

        console.log("✅ Polling finished with DONE; proceeding.");
      }
      else {

        // 1) Fetch upload URLs
        let S3Uploadobject;
        try {
          S3Uploadobject = await AuthorizationData(
            "SAVE_FORECAST",
            idToken,
            CONFIG.AWS_SECRETS_NAME,
            username,
            UUID_Generated
          );
        } catch (err) {
          console.error("❌ Failed to fetch S3 upload URLs:", err);
          return { status: "error", message: err.message };
        }

        const UploadS3SaveForecastURL = S3Uploadobject["presigned urls"]["UPLOAD"]["SAVE_FORECAST"][UUID_Generated[0]];
        const UploadS3INPUTFILEURL = S3Uploadobject["presigned urls"]["UPLOAD"]["INPUT_FILE"][UUID_Generated[0]];

        // 2) Pivot / prepare the data
        try {
          LongformData = await pivotUpFlatArrayToAC(LongformData);
        } catch (err) {
          console.error("❌ Error pivoting data:", err);
          return { status: "error", message: err.message };
        }

        // 3) Upload both files in parallel
        let flag_flatfileupload, flat_inputfileupload;
        try {
          [flag_flatfileupload, flat_inputfileupload] = await Promise.all([
            uploadFileToS3FromArray(LongformData, "Test", UploadS3SaveForecastURL),
            uploadFileToS3("Input File", UploadS3INPUTFILEURL)
          ]);
        } catch (err) {
          console.error("❌ Upload exception:", err);
          return { status: "error", message: err.message };
        }
        // 4) Ensure at least one succeeded
        if (!flag_flatfileupload && !flat_inputfileupload) {
          console.error("❌ Both uploads failed");
          return { status: "error", message: "Failed to upload forecast and input files." };
        }

        // 5) Call the service endpoint
        let servicestatus;
        try {
          servicestatus = await servicerequest(
            serviceorg_URL,
            mappedButtonName,
            UUID_Generated[0],
            Model_UUID,
            idToken,
            CONFIG.AWS_SECRETS_NAME,
            User_Id,
            cycleName,
            scenarioname,
            constituent_ID
          );
        } catch (err) {
          console.error("❌ Service request error:", err);
          return { status: "error", message: err.message };
        }

        // 6) Handle polling if needed
        var pollingResult = servicestatus;
        if (
          servicestatus === "Endpoint request timed out" ||
          (servicestatus && servicestatus.status === "Poll")
        ) {
          console.log("⏱️ Service request requires polling");
          try {
            pollingResult = await poll(
              UUID_Generated[0],
              CONFIG.AWS_SECRETS_NAME,
              pollingUrl,
              idToken
            );
          } catch (err) {
            console.error("❌ Polling error:", err);
            return { status: "error", message: err.message };
          }
        }
      }
      // sandbox aggregated forecast
      const twoD = constituent_ID_SaveStatus
        .map(str => {
          const parts = str.split("|");
          const status = parts[1]?.trim();
          if (status !== "Interim") return null;

          // Grab the UUID (with dashes) and just trim whitespace
          const uuidRaw = parts[0].split(" - ").pop() || "";
          const cleanUuid = uuidRaw.trim();

          return [status, cleanUuid];
        })
        .filter(Boolean);

      console.log(twoD);
      /// this logic need to be changed to save the agg forecast and snadboxed forecast
      if (buttonname === "SAVE_FORECAST_AGG" || buttonname === "SANDBOXED_TO_INTERIM_FORECAST_AGG") {
        const list = Array.isArray(twoD) ? twoD : [];
        const totalCount = list.length;
        let completedCount = 0;
        if (totalCount === 0) {
          console.log("ℹ️ No interim forecasts to process, nothing to lock.");
          return  "SUCCESS";
        }

        for (const [, cleanUuid] of twoD) {
          try {
            // 1️⃣ Create a unique request ID for this lock call
            const requestID = uuidv4();

            // 2️⃣ Hit the lock‐forecast endpoint with cleanUuid
            const rawLockStatus = await servicerequest(
              serviceorg_URL,
              "SANDBOXED_TO_INTERIM_FORECAST",
              requestID,
              "",                   // no Model_UUID
              idToken,
              CONFIG.AWS_SECRETS_NAME,
              User_Id,
              "",                   // no cycleName
              "",                   // no scenarioname
              [],                   // no LongformData
              [cleanUuid]             // the UUID from twoD
            );

            // 3️⃣ Normalize into a string
            const status =
              typeof rawLockStatus === "string"
                ? rawLockStatus
                : rawLockStatus.status || rawLockStatus;

            // 4️⃣ If the service asks you to poll, do so
            if (status === "Poll" || status === "Endpoint request timed out") {
              await poll(requestID, CONFIG.AWS_SECRETS_NAME, pollingUrl, idToken);
            }

            // 5️⃣ Update your progress UI
            completedCount++;
            const pct = 60 + Math.round((completedCount / totalCount) * 30);
            setPageValue(
              "LoadingCircleComponent",
              `${pct}% | Saving sandboxed forecasts…`
            );
          } catch (err) {
            console.error("❌ Error locking forecast", cleanUuid, err);
            return { status: "error", message: err.message };
          }
        }

        // (Optionally) return a final success here
        // return { status: "SUCCESS", message: "All sandboxed forecasts locked." };
      }

      /// for locking the sandbox cases 

      if (buttonname === "SAVE_LOCKED_FORECAST_AGG") {
        const list = Array.isArray(twoD) ? twoD : [];
        const totalCount = list.length;
        let completedCount = 0;
        if (totalCount === 0) {
          console.log("ℹ️ No interim forecasts to process, nothing to lock.");
          return  "SUCCESS";
        }

        for (const [, cleanUuid] of twoD) {
          try {
            // 1️⃣ Create a unique request ID for this lock call
            const requestID = uuidv4();

            // 2️⃣ Hit the lock‐forecast endpoint with cleanUuid
            const rawLockStatus = await servicerequest(
              serviceorg_URL,
              "SANDBOXED_TO_LOCKED_FORECAST",
              requestID,
              "",                   // no Model_UUID
              idToken,
              CONFIG.AWS_SECRETS_NAME,
              User_Id,
              "",                   // no cycleName
              "",                   // no scenarioname
              [],                   // no LongformData
              [cleanUuid]             // the UUID from twoD
            );

            // 3️⃣ Normalize into a string
            const status =
              typeof rawLockStatus === "string"
                ? rawLockStatus
                : rawLockStatus.status || rawLockStatus;

            // 4️⃣ If the service asks you to poll, do so
            if (status === "Poll" || status === "Endpoint request timed out") {
              await poll(requestID, CONFIG.AWS_SECRETS_NAME, pollingUrl, idToken);
            }

            // 5️⃣ Update your progress UI
            completedCount++;
            const pct = 60 + Math.round((completedCount / totalCount) * 30);
            setPageValue(
              "LoadingCircleComponent",
              `${pct}% | Saving sandboxed forecasts…`
            );
          } catch (err) {
            console.error("❌ Error locking forecast", cleanUuid, err);
            return { status: "error", message: err.message };
          }
        }

        // (Optionally) return a final success here
        // return { status: "SUCCESS", message: "All sandboxed forecasts locked." };
      }




      // 7) If locking multiple forecasts, propagate any errors there too
      if (buttonname === "SAVE_LOCKED_FORECAST_AGG") {
        const totalCount = matchedForecasts?.length || 0;
        let completedCount = 0;

        for (const match of matchedForecasts) {
          try {
            const RequestID = uuidv4();
            const newUUID = match.forecast_id.replace("forecast_", "");
            const rawLockStatus = await servicerequest(
              serviceorg_URL,
              "LOCK_FORECAST",
              RequestID,
              "",
              idToken,
              CONFIG.AWS_SECRETS_NAME,
              User_Id,
              "",
              "",
              [],
              newUUID
            );

            // Normalize into a single string status
            const status =
              typeof rawLockStatus === "string"
                ? rawLockStatus
                : rawLockStatus.status || rawLockStatus;

            // Define all the statuses we consider “okay”
            const accepted = new Set([
              "Forecast is already locked",
              "Forecast locked successfully",
              "SUCCESS",
              "Poll",
              "Endpoint request timed out",
            ]);

            if (!accepted.has(status)) {
              throw new Error(`Unexpected lock response: ${JSON.stringify(rawLockStatus)}`);
            }

            // If we need to poll (either Poll or timed out), do it
            if (status === "Poll" || status === "Endpoint request timed out") {
              await poll(RequestID, CONFIG.AWS_SECRETS_NAME, pollingUrl, idToken);
            }

            // Update completion and UI
            completedCount++;
            const pct = 60 + Math.round((completedCount / totalCount) * 30);
            setPageValue("LoadingCircleComponent", `${pct}% | Saving your forecast...`);
          } catch (err) {
            console.error("❌ Error locking forecast", match.forecast_id, err);
            return { status: "error", message: err.message };
          }
        }
      }

      // 8) If we get here, everything succeeded
      return pollingResult;
    }
    else if (buttonname === "EXTRACT_DASHBOARD_DATA") {
      console.log("📤 preparing for Forecast Library Extract");

      // 1) kick off the extract request
      let Service_Result;
      try {
        Service_Result = await Extract_Service_Request(
          serviceorg_URL,
          buttonname,
          UUID_Generated[0],
          idToken,
          CONFIG.AWS_SECRETS_NAME,
          User_Id,
          ForecastIDS
        );
      } catch (err) {
        console.error("❌ Extract_Service_Request threw:", err);
        return { status: "ERROR", message: err.message || "Service request failed" };
      }
      console.log("Service_Result", Service_Result);

      // 1a) if the service itself returned an error status, bail
      if (
        !Service_Result ||
        (typeof Service_Result === "object" && Service_Result.status === "ERROR") ||
        (typeof Service_Result === "string" && Service_Result.toLowerCase().includes("error"))
      ) {
        const msg = Service_Result?.message || Service_Result || "Service request failed";
        return { status: "ERROR", message: msg };
      }

      // 2) if it needs polling, do that
      let pollingResult = Service_Result;
      if (
        Service_Result === "Endpoint request timed out" ||
        (Service_Result && Service_Result.status === "Poll")
      ) {
        console.log("⏱️ Service request requires polling");
        try {
          pollingResult = await poll(
            UUID_Generated[0],
            CONFIG.AWS_SECRETS_NAME,
            pollingUrl,
            idToken
          );
        } catch (err) {
          console.error("❌ Polling failed:", err);
          return { status: "ERROR", message: err.message || "Polling failed" };
        }
      }

      // 2a) if polling came back with error, bail
      if (pollingResult?.status === "ERROR") {
        return {
          status: "ERROR",
          message: pollingResult.message || "Polling returned an error",
        };
      }

      // 3) fetch the presigned download link
      let Extract_download;
      try {
        Extract_download = await AuthorizationData(
          "EXTRACT_DASHBOARD_DATA",
          idToken,
          CONFIG.AWS_SECRETS_NAME,
          username,
          UUID_Generated
        );
      } catch (err) {
        console.error("❌ AuthorizationData threw:", err);
        return { status: "ERROR", message: err.message || "Failed to fetch download link" };
      }
      console.log("Extract_download", Extract_download);

      const downloadUrls = Extract_download?.["presigned urls"]?.DOWNLOAD?.EXTRACT_DASHBOARD_DATA;
      const ExtractS3_Downloadlink = downloadUrls && downloadUrls[UUID_Generated[0]];
      await updateUrlInNamedRange(ExtractS3_Downloadlink);

      // 3a) if we didn’t get a valid link, bail
      if (!ExtractS3_Downloadlink) {
        return {
          status: "ERROR",
          message: "Failed to retrieve download URL from service response",
        };
      } else {
        return {
          status: "SUCCESS",
          message: "Aggregated models downloaded.",
        };
      }
    }

    else if (buttonname === "IMPORT_ASSUMPTIONS_AGG") {

      let CONSTITUENT_AGG_ID = await ServiceRequest_Fetch_Constituent_ID(
        serviceorg_URL, "FETCH_AGG_CONSTITUENTS", UUID_Generated[0], idToken, CONFIG.AWS_SECRETS_NAME, User_Id, Forecast_UUID[0], Model_UUID);
      const prefixes = [];
      const Download_uuids = [];

      CONSTITUENT_AGG_ID.forEach(str => {
        // split on " - "
        const parts = str.split(" - ");
        // parts[0] is the prefix, parts[1] is the UUID
        prefixes.push(parts[0]?.trim());
        Download_uuids.push(parts[1]?.trim());
      });


      const S3downloadobject_OutputBackend = await AuthorizationData(
        "IMPORT_ASSUMPTIONS",
        idToken,
        CONFIG.AWS_SECRETS_NAME,
        username,
        Download_uuids
      );

      const Downloadconstituent_ID_URL = S3downloadobject_OutputBackend?.["presigned urls"]?.["DOWNLOAD"]?.["OUTPUT_FILE"];
      if (!Downloadconstituent_ID_URL) {
        console.error("❌ No download URLs received");
        return { status: "error", message: "No download URLs received" };
      }

      const keys = Object.keys(Downloadconstituent_ID_URL);
      const totalFiles = keys.length;

      if (totalFiles === 0) {
        console.warn("⚠️ No models found to download.");
        return { status: "warning", message: "No models to download." };
      }

      for (let i = 0; i < keys.length; i++) {
        const Download_uuids = keys[i];
        const url = Downloadconstituent_ID_URL[Download_uuids];
        const sheetName = prefixes[i] || `Sheet_${i + 1}`; // Fallback name

        try {
          await AggDownloadS3(url, sheetName);
          const progress = Math.round(((i + 1) / totalFiles) * 100);
          setPageValue("LoadingCircleComponent", `${progress}% | Loading Models...`);
          console.log(`✅ Downloaded: ${sheetName}`);
        } catch (error) {
          console.error(`❌ Error downloading ${sheetName}:`, error);
          // Immediately return an error response
          return {
            status: "error",
            message: `Failed to download ${sheetName}: ${error.message}`
          };
        }
      }

      await writeArrayToNamedRangeMatching(prefixes, Download_uuids, "Imported_model_List");

      console.log("✅ All downloads completed.");

      const S3downloadobject = await AuthorizationData(
        "IMPORT_ASSUMPTIONS",
        idToken,
        CONFIG.AWS_SECRETS_NAME,
        username,
        Forecast_UUID
      );

      const DownloadS3INPUTFILEURL = S3downloadobject["presigned urls"]["DOWNLOAD"]["INPUT_FILE"][Forecast_UUID[0]];
      const downloadResult = await downloadAndInsertDataFromExcel(DownloadS3INPUTFILEURL, "Input File");
      if (downloadResult.success === true) {
        return { status: "Scenario Imported" };
      }
      /// import and save the forecast
    }
    return { status: "No operation performed" };
  } catch (error) {
    console.error("🚨 Service orchestration error:", error);
    return { status: "error", message: error.message };
  }
}

/**
 * Posts a request to service orchestration.
 * @param {string} buttonName - Action to perform.
 * @param {string} secretName - AWS secrets name.
 * @param {string} userId - User ID.
 * @param {string} idToken - JWT ID token.
 * @returns {Promise<object>} - Service response.
 */
export async function postToServiceOrchestration(buttonName, secretName, userId, idToken) {
  try {
    const url = "https://eyou7tkt55.execute-api.us-east-1.amazonaws.com/dev/service_orchestration";
    const UUID_Generated = uuidv4();
    const body = {
      uuid: UUID_Generated,
      buttonName,
      secret_name: secretName,
      user_id: userId,
    };
    const headers = {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    };

    console.log("📤 Sending service orchestration request");
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`❌ Service orchestration request failed: ${response.status}`);
    }
    const data = await response.json();
    console.log("✅ Service orchestration response received");
    return data;
  } catch (error) {
    console.error("🚨 Service orchestration error:", error);
    throw error;
  }
}

// =============================================================================
//               FILE UPLOAD & EXCEL PROCESSING FUNCTIONS
// =============================================================================

/**
 * Uploads file to S3 from an Excel sheet by converting it to CSV.
 * @param {string} sheetName - Name of the Excel sheet.
 * @param {string} uploadURL - S3 presigned URL.
 * @returns {Promise<boolean>} - Success status.
 */
export async function uploadFileToS3(sheetName, uploadURL) {
  return Excel.run(async (context) => {
    console.time("⏱️ Total upload execution");

    // 1) Load data from the sheet
    const sheet = context.workbook.worksheets.getItem(sheetName);
    const range = sheet.getUsedRange();
    range.load("values");
    console.time("⏱️ Data loading");
    await context.sync();
    console.timeEnd("⏱️ Data loading");

    const values = range.values;
    if (!values || values.length === 0) {
      throw new Error("No data found in the worksheet");
    }
    console.log(`📊 Processing ${values.length} rows × ${values[0].length} columns`);

    // 2) Build CSV blob with UTF-8 BOM
    console.time("⏱️ CSV creation");
    const csvLines = values.map(row =>
      row.map(cell => {
        if (cell === null || cell === undefined) return "";
        const s = String(cell);
        return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(",")
    );
    const csvContent = csvLines.join("\n");
    console.timeEnd("⏱️ CSV creation");

    const utf8BOM = "\uFEFF";
    const blob = new Blob([utf8BOM + csvContent], { type: "text/csv;charset=utf-8" });
    console.log(`📦 Blob size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`);

    // 3) Attempt upload up to 3 times with 15s timeout each
    let lastError;
    for (let attempt = 1; attempt <= 4; attempt++) {
      // create controller to abort after 15s
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);

      try {
        console.time(`⏱️ Upload attempt ${attempt}`);
        const response = await fetch(uploadURL, {
          method: "PUT",
          headers: {
            "Content-Type": "text/csv",
            "x-amz-acl": "bucket-owner-full-control",
            "Cache-Control": "no-cache",
          },
          body: blob,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        console.timeEnd(`⏱️ Upload attempt ${attempt}`);

        if (response.ok) {
          console.log(`✅ File uploaded successfully on attempt ${attempt}`);
          console.timeEnd("⏱️ Total upload execution");
          return true;
        } else {
          const text = await response.text();
          console.error(`❌ Upload failed (status ${response.status}) on attempt ${attempt}: ${text}`);
          lastError = new Error(`Upload failed with status ${response.status}`);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
          console.error(`❌ Upload attempt ${attempt} aborted after 15s`);
          lastError = new Error("Upload aborted after timeout");
        } else {
          console.error(`❌ Upload error on attempt ${attempt}:`, err);
          lastError = err;
        }
      }

      // if not last attempt, wait 15s before retrying
      if (attempt < 3) {
        console.log(`🔄 Retrying upload in 15 seconds (attempt ${attempt + 1}/3)`);
        await new Promise(res => setTimeout(res, 30_000));
      }
    }

    // all three attempts failed
    throw lastError;
  });
}


/**
 * Downloads an Excel file from S3 and inserts its data into a target Excel sheet.
 * @param {string} s3Url - S3 URL of the Excel file.
 * @param {string} sheetName - Target Excel sheet name.
 * @returns {Promise<object>} - Success status and sheet name.
 */
export async function downloadAndInsertDataFromExcel(s3Url, sheetName) {
  // 1️⃣ Fetch bytes
  const buffer = await fetchData(s3Url);
  console.time("⏱️ Total download execution");

  // 2️⃣ Parse CSV/XLSX into 2D array
  const rows = parseCsvOrXlsx(buffer, s3Url);
  if (!rows.length) throw new Error("❌ No data to insert");

  // 3️⃣ Bulk-write in one go
  await Excel.run(async (ctx) => {
    // a) get or create sheet
    let sheet = ctx.workbook.worksheets.getItemOrNullObject(sheetName);
    await ctx.sync();
    if (sheet.isNullObject) sheet = ctx.workbook.worksheets.add(sheetName);

    // b) clear old data
    sheet.getUsedRangeOrNullObject().clear(Excel.ClearApplyTo.all);

    // c) suspend screen updating & manual calc
    ctx.application.suspendScreenUpdatingUntilNextSync();
    ctx.application.calculationMode = Excel.CalculationMode.manual;
    await ctx.sync();

    // d) single large range write
    const totalRows = rows.length;
    const totalCols = rows[0].length;
    const writeRange = sheet.getRangeByIndexes(0, 0, totalRows, totalCols);
    writeRange.values = rows;

    // e) final sync
    await ctx.sync();

    // f) restore calc & (screen updating auto-resumes)
    ctx.application.calculationMode = Excel.CalculationMode.automatic;
    ctx.application.calculate(Excel.CalculationType.full);
    await ctx.sync();
    console.timeEnd("⏱️ Total download execution");
  });

  return { success: true, newSheetName: sheetName };
}

async function fetchData(url) {
  const resp = await fetch(url, { headers: { "Cache-Control": "no-cache" } });
  if (!resp.ok) throw new Error(`Fetch failed: ${resp.statusText}`);
  return resp.arrayBuffer();
}

function parseCsvOrXlsx(buffer, url) {
  if (url.toLowerCase().endsWith(".csv")) {
    const txt = new TextDecoder("utf-8").decode(buffer);
    return txt
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => l.split(","));
  } else {
    const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  }
}

/**
 * Uploads array data to S3 as CSV or Excel.
 * @param {Array} dataArray - Data to upload.
 * @param {string} fileName - Target file name.
 * @param {string} uploadURL - S3 presigned URL.
 * @param {string} format - File format ("csv" or "xlsx").
 * @returns {Promise<boolean>} - Success status.
 */

export async function uploadFileToS3FromArray(dataArray, fileName, uploadURL, format = "csv") {
  try {
    console.time("⏱️ Total array upload");


    if (!dataArray || dataArray.length === 0) {
      console.error("🚨 No data provided for upload");
      return false;
    }

    const rowCount = dataArray.length;
    const colCount = dataArray[0].length;
    console.log(`📊 Processing ${rowCount} rows × ${colCount} columns as ${format.toUpperCase()}`);

    let blob;
    let contentType;

    if (format.toLowerCase() === "csv") {
      console.time("⏱️ CSV creation");
      let csvContent = "";

      const chunkSize = CONFIG.UPLOAD.CHUNK_SIZE;
      for (let i = 0; i < rowCount; i += chunkSize) {
        const endRow = Math.min(i + chunkSize, rowCount);
        let chunkContent = "";

        for (let j = i; j < endRow; j++) {
          const row = dataArray[j];
          const rowString = row
            .map((cell) => {
              if (cell === null || cell === undefined) return "";
              const cellStr = String(cell);
              return cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")
                ? `"${cellStr.replace(/"/g, '""')}"`
                : cellStr;
            })
            .join(",");
          chunkContent += rowString + "\n";
        }

        csvContent += chunkContent;
      }

      const bom = "\uFEFF";
      blob = new Blob([bom, csvContent], { type: "text/csv;charset=utf-8;" });
      contentType = "text/csv";
      console.timeEnd("⏱️ CSV creation");
    } else {
      // handle other formats if applicable
      return false;
    }

    console.log(`📤 Uploading ${(blob.size / (1024 * 1024)).toFixed(2)} MB to: ${uploadURL}`);

    const MAX_RETRIES = 3;
    const TIMEOUT_MS = 60000;
    let attempt = 0;
    let success = false;
    let lastError = null;

    while (attempt < MAX_RETRIES && !success) {
      attempt++;
      console.log(`⏳ Upload attempt ${attempt}`);

      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
        console.warn(`⏱️ Upload attempt ${attempt} aborted after ${TIMEOUT_MS / 1000} seconds`);
      }, TIMEOUT_MS);

      try {
        console.time("⏱️ Upload");
        const response = await fetch(uploadURL, {
          method: "PUT",
          headers: {
            "Content-Type": contentType,
            "x-amz-acl": "bucket-owner-full-control",
            "Cache-Control": "no-cache",
          },
          body: blob,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        console.timeEnd("⏱️ Upload");

        if (response.ok) {
          console.log(`✅ File uploaded successfully on attempt ${attempt}`);
          success = true;
          break;
        } else {
          const errorText = await response.text();
          console.error(`❌ Server returned status ${response.status}: ${errorText}`);
          lastError = errorText;
        }
      } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
          console.warn("⚠️ Upload timed out");
        } else {
          console.error(`🚨 Upload error on attempt ${attempt}:`, err);
        }
        lastError = err;
      }
    }

    console.timeEnd("⏱️ Total array upload");
    if (success) return true;

    console.error("❌ All upload attempts failed", lastError);
    return false;

  } catch (error) {
    console.error("🚨 Unexpected error in uploadFileToS3FromArray:", error);
    return false;
  } finally {
    if (typeof global !== "undefined" && global.gc) {
      global.gc();
    }
  }
}


//////////////// this is start of working code ----------------------------------------------------------------------------
// export async function uploadFileToS3FromArray(dataArray, fileName, uploadURL, format = "csv") {
//   try {
//     console.time("⏱️ Total array upload");
//     if (!dataArray || dataArray.length === 0) {
//       console.error("🚨 No data provided for upload");
//       return false;
//     }
//     const rowCount = dataArray.length;
//     const colCount = dataArray[0].length;
//     console.log(`📊 Processing ${rowCount} rows × ${colCount} columns as ${format.toUpperCase()}`);
//     let blob;
//     let contentType;

//     if (format.toLowerCase() === "csv") {
//       console.time("⏱️ CSV creation");
//       let csvContent = "";

//       const chunkSize = CONFIG.UPLOAD.CHUNK_SIZE;
//       for (let i = 0; i < rowCount; i += chunkSize) {
//         const endRow = Math.min(i + chunkSize, rowCount);
//         let chunkContent = "";

//         for (let j = i; j < endRow; j++) {
//           const row = dataArray[j];
//           const rowString = row
//             .map((cell) => {
//               if (cell === null || cell === undefined) return "";
//               const cellStr = String(cell);
//               // escape quotes and wrap in quotes if needed
//               return cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")
//                 ? `"${cellStr.replace(/"/g, '""')}"`
//                 : cellStr;
//             })
//             .join(",");
//           chunkContent += rowString + "\n";
//         }

//         csvContent += chunkContent;
//       }

//       // Prefix with the UTF-8 BOM so Excel and other tools recognize UTF-8
//       const bom = "\uFEFF";
//       blob = new Blob([bom, csvContent], { type: "text/csv;charset=utf-8;" });
//       contentType = "text/csv";
//       console.timeEnd("⏱️ CSV creation");
//     } else {
//       // … (your existing Excel/worker branch unchanged) …
//     }

//     console.log(`📤 Uploading ${(blob.size / (1024 * 1024)).toFixed(2)} MB to: ${uploadURL}`);
//     console.time("⏱️ Upload");
//     const response = await fetch(uploadURL, {
//       method: "PUT",
//       headers: {
//         "Content-Type": contentType,
//         "x-amz-acl": "bucket-owner-full-control",
//         "Cache-Control": "no-cache",
//       },
//       body: blob,
//     });
//     console.timeEnd("⏱️ Upload");
//     console.timeEnd("⏱️ Total array upload");

//     if (response.ok) {
//       console.log(`✅ File uploaded successfully. Size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`);
//       return true;
//     } else {
//       console.error(`❌ Error uploading file. Status: ${response.status}`, await response.text());
//       return false;
//     }
//   } catch (error) {
//     console.error("🚨 Error in uploadFileToS3FromArray:", error);
//     return false;
//   } finally {
//     if (typeof global !== "undefined" && global.gc) {
//       global.gc();
//     }
//   }
// }
/// this is end of working code------------------------------------------------------------------------



// export async function uploadFileToS3FromArray(dataArray, fileName, uploadURL, format = "csv") {
//   try {
//     console.time("⏱️ Total array upload");

//     if (!dataArray || dataArray.length === 0) {
//       console.error("🚨 No data provided for upload");
//       return false;
//     }

//     const rowCount = dataArray.length;
//     const colCount = dataArray[0] ? dataArray[0].length : 0;
//     console.log(`📊 Processing ${rowCount} rows × ${colCount} columns as ${format.toUpperCase()}`);

//     console.time("⏱️ CSV creation");

//     const rows = new Array(rowCount);
//     const batchSize = CONFIG.UPLOAD.CHUNK_SIZE || 50000;

//     for (let i = 0; i < rowCount; i += batchSize) {
//       const endRow = Math.min(i + batchSize, rowCount);
//       for (let j = i; j < endRow; j++) {
//         const row = dataArray[j];
//         rows[j] = row.map(cell => {
//           if (cell === null || cell === undefined) return "";
//           const cellStr = String(cell);
//           return cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")
//             ? '"' + cellStr.replace(/"/g, '""') + '"'
//             : cellStr;
//         }).join(",");
//       }

//       if (i > 0 && i % (batchSize * 4) === 0) {
//         await new Promise(resolve => setTimeout(resolve, 0));
//       }
//     }

//     const csvContent = rows.join("\n");
//     const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
//     rows.length = 0;

//     console.timeEnd("⏱️ CSV creation");
//     console.log(`📤 Uploading ${(blob.size / (1024 * 1024)).toFixed(2)} MB to: ${uploadURL}`);

//     console.time("⏱️ Upload");

//     const response = await fetch(uploadURL, {
//       method: "PUT",
//       headers: {
//         "Content-Type": "text/csv",
//         "x-amz-acl": "bucket-owner-full-control",
//         "Cache-Control": "no-cache",
//       },
//       body: blob,
//     });

//     console.timeEnd("⏱️ Upload");
//     console.timeEnd("⏱️ Total array upload");

//     if (response.ok) {
//       console.log(`✅ File uploaded successfully. Size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`);
//       return true;
//     } else {
//       console.error(`❌ Upload failed. Status: ${response.status}`, await response.text());
//       return false;
//     }

//   } catch (error) {
//     console.error("🚨 Error in uploadFileToS3FromArray:", error);
//     return false;
//   } finally {
//     if (typeof global !== "undefined" && global.gc) {
//       global.gc();
//     }
//   }
// }

// =============================================================================
//                          POLLING FUNCTION
// =============================================================================

/**
 * Polls for completion of a long-running operation.
 * @param {string} request_id - Request ID to poll.
 * @param {string} secret_name - AWS secrets name.
 * @param {string} pollingUrl - Polling endpoint URL.
 * @param {string} idToken - JWT ID token.
 * @returns {Promise<object>} - Polling result.
 */
export async function poll(request_id, secret_name, pollingUrl, idToken) {
  if (!request_id || !secret_name) {
    console.error("❌ Missing required polling parameters");
    return { request_id, result: false };
  }

  const maxAttempts = CONFIG.POLLING.MAX_ATTEMPTS;
  const delay = CONFIG.POLLING.DELAY_MS;
  let attempts = 0;
  let responseBody;

  console.log(`⏱️ Starting polling for request: ${request_id}`);

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(pollingUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
          Accept: "*/*",
          Connection: "keep-alive",
        },
        body: JSON.stringify({ request_id, secret_name }),
      });

      if (!response.ok) {
        console.error(`❌ Polling request failed: ${response.status}`);
        return { request_id, result: false };
      }

      responseBody = await response.json();
      const status = responseBody?.status?.status;

      console.log(`🔄 Polling attempt ${attempts + 1}: ${status}`);

      if (status === "DONE") {
        console.log("✅ Operation completed successfully");
        return { request_id, result: status };
      } else if (status === "PENDING") {
        console.log(`⏳ Operation still in progress, waiting ${delay / 1000}s`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempts++;
      } else {
        console.error(`❌ Unexpected polling status: ${status}`);
        return { request_id, result: status };
      }
    } catch (error) {
      console.error("🚨 Polling error:", error);
      return { request_id, result: responseBody?.status?.status || "ERROR" };
    }
  }

  console.error(`⏱️ Polling timed out after ${maxAttempts} attempts`);
  return { request_id, result: responseBody?.status?.status || "TIMEOUT" };
}

// =============================================================================
//                  WEB WORKER HELPER FUNCTION
// =============================================================================

/**
 * Uses a Web Worker to create an Excel blob from array data.
 * @param {Array} dataArray - Data array.
 * @param {string} sheetName - Target sheet name.
 * @returns {Promise<Blob>} - Excel blob.
 */
function createExcelBlobInWorker(dataArray, sheetName) {
  return new Promise((resolve, reject) => {
    const workerCode = `
      self.onmessage = function(e) {
        importScripts('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
        const data = e.data.data;
        const sheetName = e.data.sheetName;
        const ws = {};
        const range = { s: { c: 0, r: 0 }, e: { c: data[0].length - 1, r: data.length - 1 } };
        ws['!ref'] = XLSX.utils.encode_range(range);
        for (let R = 0; R < data.length; ++R) {
          for (let C = 0; C < data[0].length; ++C) {
            const cell_ref = XLSX.utils.encode_cell({ c: C, r: R });
            const value = data[R][C];
            if (value == null) continue;
            if (typeof value === 'number') {
              ws[cell_ref] = { v: value, t: 'n' };
            } else if (typeof value === 'boolean') {
              ws[cell_ref] = { v: value, t: 'b' };
            } else if (value instanceof Date) {
              ws[cell_ref] = { v: value, t: 'd' };
            } else {
              ws[cell_ref] = { v: value, t: 's' };
            }
          }
        }
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        const binaryString = XLSX.write(wb, {
          bookType: "xlsx",
          type: "binary",
          compression: true,
          compressionOptions: { level: ${CONFIG.UPLOAD.COMPRESSION_LEVEL} }
        });
        const buf = new ArrayBuffer(binaryString.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < binaryString.length; i++) {
          view[i] = binaryString.charCodeAt(i) & 0xFF;
        }
        self.postMessage({ buffer: buf }, [buf]);
      };
    `;
    const blob = new Blob([workerCode], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    try {
      const worker = new Worker(workerUrl);
      worker.onmessage = function (e) {
        const excelBlob = new Blob([e.data.buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        URL.revokeObjectURL(workerUrl);
        worker.terminate();
        resolve(excelBlob);
      };
      worker.onerror = function (e) {
        URL.revokeObjectURL(workerUrl);
        worker.terminate();
        reject(new Error("Worker error: " + e.message));
      };
      worker.postMessage({ data: dataArray, sheetName });
    } catch (e) {
      URL.revokeObjectURL(workerUrl);
      reject(e);
    }
  });
}

/////////////////////////////////////////////////////////////section for agg load models ////////////////////////////////////

/**
 * Downloads an Excel file from S3 and inserts its data into a target Excel sheet starting from a specific cell.
 * @param {string} s3Url - S3 URL of the Excel file.
 * @param {string} sheetName - Target Excel sheet name.
 * @param {string} startCell - The cell where the data should be pasted (e.g., 'B4').
 * @returns {Promise<object>} - Success status and sheet name.
 */
export async function AggDownloadS3(s3Url, sheetName, startCell = "B4") {
  const downloadURL = s3Url;
  const MAX_ATTEMPTS = 3;
  const TIMEOUT_MS = 15000; // 15 seconds

  // Fetch with timeout & abort
  async function fetchWithTimeout(url, timeout) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      console.log("📥 Fetching file from S3");
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(id);

      if (!response.ok) {
        throw new Error(`❌ File fetch failed: ${response.statusText}`);
      }
      console.log("✅ File fetched successfully");
      return await response.arrayBuffer();
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  // Attempt fetch up to MAX_ATTEMPTS
  async function fetchData() {
    let lastError;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await fetchWithTimeout(downloadURL, TIMEOUT_MS);
      } catch (err) {
        lastError = err;
        console.warn(`Attempt ${attempt} failed: ${err.message}`);
        if (attempt === MAX_ATTEMPTS) {
          throw new Error(`❌ Failed after ${MAX_ATTEMPTS} attempts: ${lastError.message}`);
        }
      }
    }
  }

  // Process Excel with UTF-8 BOM support
  async function processExcelFile(arrayBuffer, sheetName, startCell) {
    console.log("⚙️ Processing Excel file");
    // ensure UTF-8 BOM (codepage 65001) for text contents
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), {
      type: "array",
      codepage: 65001
    });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    let rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (rows.length === 0) {
      throw new Error("❌ Excel sheet is empty");
    }

    // Normalize rows so each row has the same number of columns
    const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0);
    rows = rows.map(row => {
      if (row.length < maxCols) {
        return [...row, ...Array(maxCols - row.length).fill("")];
      }
      return row;
    });

    await insertParsedData(rows, sheetName, startCell);
  }

  function parseCellReference(cellReference) {
    const regex = /^([A-Za-z]+)(\d+)$/;
    const match = regex.exec(cellReference);
    if (!match) {
      throw new Error(`Invalid cell reference: ${cellReference}`);
    }
    const [, columnLetter, rowStr] = match;
    const rowIndex = parseInt(rowStr, 10) - 1;
    let columnIndex = 0;
    for (let i = 0; i < columnLetter.length; i++) {
      columnIndex = columnIndex * 26 + (columnLetter.charCodeAt(i) - 65 + 1);
    }
    return { columnIndex: columnIndex - 1, rowIndex };
  }

  function getColumnLetter(index) {
    let letter = "";
    let temp = index;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  }

  async function insertParsedData(rows, sheetName, startCell) {
    await Excel.run(async context => {
      const sheet = context.workbook.worksheets.getItemOrNullObject(sheetName);
      await context.sync();
      if (sheet.isNullObject) {
        throw new Error(`❌ Sheet "${sheetName}" not found`);
      }

      const { columnIndex, rowIndex } = parseCellReference(startCell);
      const maxCols = rows[0].length;
      const endCol = columnIndex + maxCols - 1;
      const endRow = rowIndex + rows.length - 1;
      const rangeAddress = `${startCell}:${getColumnLetter(endCol)}${endRow + 1}`;

      console.log(`📊 Target range: ${rangeAddress}`);
      const targetRange = sheet.getRange(rangeAddress);
      targetRange.clear(Excel.ClearApplyTo.contents);
      await context.sync();

      targetRange.values = rows;
      await context.sync();
      console.log(`✅ Data inserted into "${sheetName}" starting from ${startCell}`);
    });
  }

  try {
    console.log("🚀 Starting download and insertion process");
    const arrayBuffer = await fetchData();
    await processExcelFile(arrayBuffer, sheetName, startCell);
    console.log("✅ Process completed successfully");
    return { success: true, newSheetName: sheetName };
  } catch (error) {
    console.error("🚨 Download and insertion error:", error);
    return { success: false, newSheetName: null };
  }
}


export const sync_MetaData_AGG = async (setPageValue) => {
  console.log("Update Actuals button clicked");
  setPageValue("LoadingCircleComponent", "Syncing data...");

  try {
    const responseBody = await FetchMetaData(
      "FETCH_METADATA",
      localStorage.getItem("idToken"),
      CONFIG.AWS_SECRETS_NAME,
      localStorage.getItem("User_ID"),
      localStorage.getItem("username")
    );

    await Excelconnections.apiResponseToExcel(responseBody, "cloud_backend_ds", "A1");
    console.log("Metadata synced to Excel");
    setPageValue("SaveForecastPageinterim", "Dropdowns synced with the latest scenario names from the data lake");
  } catch (error) {
    console.error("Error fetching metadata or syncing to Excel:", error);
  }
};

/// concatnated Flatfile for upload code :
export function combineArrays(arr1, matchedModel, extra1, extra2, extra3, extra4, extra5) {
  // Define the extra headers
  const extraHeaders = ["scenario_name", "cycle_name", "forecast_id", "save_status", "forecast_last_updated"];

  // Pre-build matchedModel values
  const matchedModelValues = ["model_name", "indication", "sub_indication", "asset", "model_type", "model_phase"];

  // Extract the header from the first row of arr1
  const header = arr1[0];

  // Update the header row with matchedModel headers and then extra headers
  const updatedHeader = header.concat(matchedModelValues, extraHeaders);

  // Create the result array starting with the updated header
  const result = [updatedHeader];

  // Prepare the row values to append for each row in arr1
  for (let i = 1; i < arr1.length; i++) {
    // Get the current row from arr1
    const row = arr1[i];

    // Add the matchedModel values to the row
    const rowWithMatchedModelValues = row.concat([
      matchedModel.model_name,
      matchedModel.indication,
      matchedModel.sub_indication,
      matchedModel.asset,
      matchedModel.model_type,
      matchedModel.model_phase,
    ]);

    // Add the extra values to the row
    const finalRow = rowWithMatchedModelValues.concat([extra1, extra2, extra3, extra4, extra5]);

    // Push the final row to the result array
    result.push(finalRow);
  }

  return result;
}




/**
 * Pivot your flat “timeline/value” rows up into two‐row groups,
 * using a fixed 20-column header (flow_name…RowType) and then
 * your dynamic timeline columns.
 *
 * @param {any[][]} flatData  2D array with first row = headers,
 *                            rest = data rows (must include "timeline" & "value" columns)
 * @returns {any[][]}         2D array:
 *   – Row 0 is the fixed header ["flow_name",…,"RowType"]
 *   – Then for each group of identical first-19 cols:
 *       • a row with RowType="Timeline"
 *       • a row with RowType="Value"
 *     and after column-20 your unique timeline labels
 */
export function pivotUpFlatArrayToAC(flatData) {
  if (!Array.isArray(flatData) || flatData.length < 2) {
    console.warn("Not enough data to pivot (need at least header + 1 row).");
    return [];
  }

  // 1) fixed headers: 19 data cols + RowType
  const fixedHeaders = [
    "flow_name", "region", "output_name", "input_output",
    "level_1", "level_2", "level_3", "level_4", "level_5",
    "level_6", "level_7", "level_8", "level_9", "level_10",
    "level_11", "level_12", "level_13", "level_14", "level_15",
    "RowType"
  ];

  // 2) case-insensitive lookup of the timeline/value columns
  const headersLC = flatData[0].map(h => String(h).toLowerCase());
  const timelineIndex = headersLC.indexOf("timeline");
  const valueIndex = headersLC.indexOf("value");
  if (timelineIndex < 0 || valueIndex < 0) {
    throw new Error(`Missing "timeline" or "value" column; found: ${flatData[0].join(",")}`);
  }

  // 3) group rows by the first 19 columns, using a Map + JSON key
  const groups = new Map();
  for (let i = 1; i < flatData.length; i++) {
    const row = flatData[i];
    const key = JSON.stringify(row.slice(0, 19));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  // 4) extract each group’s heads & vals, track maxHeads
  const summaries = [];
  let maxHeads = 0;

  for (let [key, rows] of groups.entries()) {
    const base = JSON.parse(key);
    const seen = new Set();
    const heads = [];
    const vals = [];
    let missing = 1;

    for (let r of rows) {
      let tl = r[timelineIndex];
      if (tl == null || tl === "") tl = missing++;
      const tlKey = String(tl);
      if (!seen.has(tlKey)) {
        seen.add(tlKey);
        heads.push(tl);
        vals.push(r[valueIndex]);
      }
    }

    maxHeads = Math.max(maxHeads, heads.length);
    summaries.push({ base, heads, vals });
  }

  // 5) build the single top header: fixed + maxHeads × "Timeline"
  const header = [
    ...fixedHeaders,
    ...Array(maxHeads).fill("Timeline")
  ];

  // 6) emit the pivoted rows, padding shorter groups
  const result = [header];
  for (let { base, heads, vals } of summaries) {
    const pad = maxHeads - heads.length;
    result.push([
      ...base,
      "Timeline",
      ...heads,
      ...Array(pad).fill("")
    ]);
    result.push([
      ...base,
      "Value",
      ...vals,
      ...Array(pad).fill("")
    ]);
  }

  return result;
}


// this fucntion is checking if the user has access to the button or not
// SAVE_FORECAST,SAVE_LOCKED_FORECAST, UNLOCK_FORECAST, LOCK_FORECAST, FETCH_ASSUMPTIONS, FETCH_METADATA, DELETE_FORECAST
export async function ButtonAccess(buttonname) {
  // grab everything AuthorizationData needs:
  const emailId = localStorage.getItem('username');
  const idToken = localStorage.getItem('idToken');
  const secretName = CONFIG.AWS_SECRETS_NAME;
  const UUID = [uuidv4()];               // wrap in array

  // just call your working function:
  return AuthorizationData(buttonname, idToken, secretName, emailId, UUID);
}


async function writeArrayToNamedRange(arrayData, rangeName) {
  return Excel.run(async (context) => {
    // 1) Validate input is at least a non-empty array
    if (!Array.isArray(arrayData) || arrayData.length === 0) {
      throw new Error("writeArrayToNamedRange: arrayData must be a non-empty array");
    }
    // 2) If it's 1D, convert to Nx1
    if (!Array.isArray(arrayData[0])) {
      arrayData = arrayData.map(item => [item]);
    }
    const rowCount = arrayData.length;
    const colCount = arrayData[0].length;
    if (colCount === 0) {
      throw new Error("writeArrayToNamedRange: inner arrays must be non-empty");
    }

    // 3) Locate the named range (workbook or sheet scope)
    const wbNames = context.workbook.names;
    const wbItem = wbNames.getItemOrNullObject(rangeName);
    await context.sync();

    let baseRange;
    if (!wbItem.isNullObject) {
      baseRange = wbItem.getRange();
    } else {
      const sheets = context.workbook.worksheets;
      sheets.load("items/name");
      await context.sync();
      for (const sheet of sheets.items) {
        const sheetItem = sheet.names.getItemOrNullObject(rangeName);
        await context.sync();
        if (!sheetItem.isNullObject) {
          baseRange = sheetItem.getRange();
          break;
        }
      }
      if (!baseRange) {
        throw new Error(`Named range "${rangeName}" not found.`);
      }
    }

    // 4) Anchor at top-left cell of that range
    const anchor = baseRange.getCell(0, 0);
    // 5) Resize from that single cell to exactly rowCount×colCount
    const target = anchor.getResizedRange(rowCount - 1, colCount - 1);

    // 6) Finally write
    target.values = arrayData;

    await context.sync();
  });
}


async function writeArrayToNamedRangeMatching(matchKeys, newValues, rangeName) {
  if (!Array.isArray(matchKeys) || !Array.isArray(newValues))
    throw new Error("Both inputs must be arrays");
  if (matchKeys.length !== newValues.length)
    throw new Error("matchKeys and newValues must be same length");
  if (matchKeys.length === 0)
    throw new Error("Arrays must be non-empty");

  return Excel.run(async (context) => {
    // 1) Locate the named range
    const wbItem = context.workbook.names.getItemOrNullObject(rangeName);
    await context.sync();

    let baseRange;
    if (!wbItem.isNullObject) {
      baseRange = wbItem.getRange();
    } else {
      const sheets = context.workbook.worksheets;
      sheets.load("items/name");
      await context.sync();
      for (const sheet of sheets.items) {
        const sheetItem = sheet.names.getItemOrNullObject(rangeName);
        await context.sync();
        if (!sheetItem.isNullObject) {
          baseRange = sheetItem.getRange();
          break;
        }
      }
      if (!baseRange) {
        throw new Error(`Named range "${rangeName}" not found.`);
      }
    }

    // 2) Load its rowCount
    baseRange.load("rowCount");
    await context.sync();
    const rowCount = baseRange.rowCount;

    // 3) Build the left-hand column range
    const leftRange = baseRange
      .getOffsetRange(0, -1)
      .getResizedRange(rowCount - 1, 0);

    // 4) Load both columns' values
    leftRange.load("values");
    baseRange.load("values");
    await context.sync();

    const leftVals = leftRange.values;    // [[key1],[key2],...]
    const outVals = baseRange.values;     // [[oldVal1],[oldVal2],...]

    // 5) Match & replace
    matchKeys.forEach((key, i) => {
      const trimmedKey = ("" + key).trim();
      for (let r = 0; r < leftVals.length; r++) {
        if (("" + leftVals[r][0]).trim() === trimmedKey) {
          outVals[r][0] = newValues[i];
          break;
        }
      }
    });

    // 6) Write back
    baseRange.values = outVals;
    await context.sync();
  });
}


//// forecast library download s3 fucniton 


/**
 * Fetches the given URL with retry and a 1-minute timeout per attempt.
 * @param {string} url       - The URL to fetch.
 * @param {number} retries   - Number of retry attempts (default: 3).
 * @param {number} timeoutMs - Timeout per attempt in milliseconds (default: 60000).
 * @returns {Promise<ArrayBuffer>}
 */
async function fetchDataWithRetry(url, retries = 3, timeoutMs = 60000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(url, {
        headers: { "Cache-Control": "no-cache" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!resp.ok) {
        throw new Error(`Fetch failed (status ${resp.status})`);
      }
      return await resp.arrayBuffer();
    } catch (err) {
      clearTimeout(timeoutId);
      if (attempt === retries) {
        throw new Error(`Failed to fetch after ${retries} attempts: ${err.message}`);
      }
      console.warn(`Fetch attempt ${attempt} failed, retrying…`);
      await new Promise(res => setTimeout(res, 500));
    }
  }
}

/**
 * Parses a CSV or XLSX ArrayBuffer into a 2D array of strings,
 * handling UTF-8-SIG (BOM) for CSV.
 *
 * @param {ArrayBuffer} buffer
 * @param {string} url  - Used to detect .csv vs .xlsx
 * @returns {string[][]}
 */
function parseCsvOrXlsx1(buffer, url) {
  if (url.toLowerCase().endsWith(".csv")) {
    let txt = new TextDecoder("utf-8").decode(buffer);
    // Strip BOM if present
    if (txt.charCodeAt(0) === 0xFEFF) {
      txt = txt.slice(1);
    }
    return txt
      .split("\n")
      .filter(line => line.trim() !== "")
      .map(line => line.split(","));
  } else {
    const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  }
}

/**
 * Downloads a CSV or XLSX file from S3 (with retry & timeout),
 * parses it into a UTF-8-SIG–aware 2D array, and returns that array.
 *
 * @param {string} s3Url
 * @returns {Promise<string[][]>}
 */
export async function downloadFileToArray(s3Url) {
  // 1) Download bytes
  const buffer = await fetchDataWithRetry(s3Url, 3, 60000);

  // 2) Parse to 2D array
  const rows = parseCsvOrXlsx1(buffer, s3Url);
  if (!rows.length) {
    throw new Error("No data found in the downloaded file.");
  }

  // 3) Return the array
  return rows;
}

// end of fucntion 

// column flag fucntion 

/**
 * Inserts a “flag” column at position 31 (index 30), with a header,
 * based on the metric→flag mapping (matching row[12] → mapping[row[12]]).
 *
 * @param {any[][]} data  - Original 2D array (header + data rows)
 * @returns {any[][]}     - New 2D array with the extra “flag” column
 */
function insertFlagColumn(data) {
  if (!Array.isArray(data) || data.length === 0) return data;

  // 1) Hard-coded metric→flag list
  const metricFlags = {
    /* ... your full mapping here ... */
    "Incident Patients": 35,
    "Compliance Rate": 11,
    /* etc */
    "Segment Split (For Calculating Bolus Patients)": 0
  };

  const rowCount = data.length;
  const colCount = data[0].length;
  const newColCount = colCount + 1;
  const out = new Array(rowCount);

  // 2) Process header row (index 0)
  {
    const header = data[0];
    const newHeader = new Array(newColCount);
    // copy columns 0–29
    for (let c = 0; c < 30; c++) {
      newHeader[c] = header[c];
    }
    // inject header
    newHeader[30] = "flag";
    // copy columns 30–end
    for (let c = 30; c < colCount; c++) {
      newHeader[c + 1] = header[c];
    }
    out[0] = newHeader;
  }

  // 3) Process each data row
  for (let r = 1; r < rowCount; r++) {
    const row = data[r];
    const newRow = new Array(newColCount);

    // copy columns 0–29
    for (let c = 0; c < 30; c++) {
      newRow[c] = row[c];
    }

    // compute flag from metric in col 12
    const key = row[12];
    newRow[30] = metricFlags.hasOwnProperty(key)
      ? metricFlags[key]
      : null;

    // copy columns 30–end
    for (let c = 30; c < colCount; c++) {
      newRow[c + 1] = row[c];
    }

    out[r] = newRow;
  }

  return out;
}



// end of column flag fucntion
export async function overwriteViaSheetUltraOptimized(
  rows,
  sheetName = "Report Genie Backend",
  tableName = "Table7"
) {
  const startTime = performance.now();
  const bodyRows = rows.slice(1);
  const totalRows = bodyRows.length;
  const totalCols = bodyRows[0]?.length || 0;
  const totalCells = totalRows * totalCols;

  console.log(`🚀 ULTRA-OPTIMIZED: ${totalRows} rows × ${totalCols} cols = ${totalCells.toLocaleString()} cells`);

  await Excel.run(async ctx => {
    let stepTime = performance.now();

    // STEP 1: Maximize performance up front
    console.log(`⚡ Suspending screen updates & switching to manual calc mode…`);
    ctx.application.suspendScreenUpdatingUntilNextSync();
    ctx.application.calculationMode = Excel.CalculationMode.manual;
    ctx.application.suspendApiCalculationUntilNextSync();

    // STEP 2: Bulk‐load all objects
    console.log(`📋 Loading worksheet & table references…`);
    let ws = ctx.workbook.worksheets.getItemOrNullObject(sheetName);
    ws.load("isNullObject");

    const table = ctx.workbook.tables.getItem(tableName);
    const header = table.getHeaderRowRange();
    const bodyRange = table.getDataBodyRange();

    header.load(["rowIndex", "columnIndex"]);
    bodyRange.load("isNullObject");

    await ctx.sync(); // first sync
    console.log(`⏱️  Load sync took ${(performance.now() - stepTime).toFixed(2)}ms`);
    stepTime = performance.now();

    // If sheet didn’t exist, add it now
    if (ws.isNullObject) {
      ws = ctx.workbook.worksheets.add(sheetName);
      console.log(`➕ Created new sheet: ${sheetName}`);
    }

    // STEP 3: Clear out old data (queued)
    if (!bodyRange.isNullObject) {
      bodyRange.clear(Excel.ClearApplyTo.contents);
      console.log(`🗑️  Queued clearing of existing table body`);
    }

    // STEP 4: Compute write offsets
    const R0 = header.rowIndex + 1;
    const C0 = header.columnIndex;
    console.log(`📍 Writing beginning at row ${R0}, col ${C0}`);

    // STEP 5: Write data (queued, no sync yet)
    const MAX_SINGLE_WRITE = 10_000_000;
    if (totalCells <= MAX_SINGLE_WRITE) {
      console.log(`💥 Queueing single-write of all ${totalRows} rows…`);
      ws.getRangeByIndexes(R0, C0, totalRows, totalCols).values = bodyRows;
      console.log(`✏️  Single-write queued`);
    } else {
      const OPT_CHUNK = Math.min(4000, Math.floor(MAX_SINGLE_WRITE / totalCols));
      const chunks = Math.ceil(totalRows / OPT_CHUNK);
      console.log(`📦 Queueing ${chunks} chunks of up to ${OPT_CHUNK} rows each…`);

      for (let i = 0; i < chunks; i++) {
        const startRow = i * OPT_CHUNK;
        const chunkSize = Math.min(OPT_CHUNK, totalRows - startRow);
        const chunkData = bodyRows.slice(startRow, startRow + chunkSize);
        ws.getRangeByIndexes(R0 + startRow, C0, chunkSize, totalCols).values = chunkData;
        console.log(`   – Queued chunk ${i + 1}/${chunks} (${chunkSize} rows)`);
      }
    }

    // STEP 6: Resize the table (queued)
    console.log(`📏 Queueing table resize to fit ${totalRows + 1} rows…`);
    const newTableRange = ws.getRangeByIndexes(header.rowIndex, C0, totalRows + 1, totalCols);
    table.resize(newTableRange);

    console.log(`⏱️  All edits queued in ${(performance.now() - stepTime).toFixed(2)}ms`);
    stepTime = performance.now();

    // STEP 7: Suspend screen updates again before the big sync
    console.log(`⚡ Suspending screen updates one more time before main sync…`);
    ctx.application.suspendScreenUpdatingUntilNextSync();

    console.log(`🔄 Executing all queued operations…`);
    await ctx.sync(); // this is where Excel actually applies everything

    console.log(`⏱️  Main sync took ${(performance.now() - stepTime).toFixed(2)}ms`);

    // STEP 8: Restore calculation mode (screen updates auto-resume)
    ctx.application.calculationMode = Excel.CalculationMode.automatic;

    // Final performance stats
    const totalTime = performance.now() - startTime;
    const cps = totalCells / (totalTime / 1000);
    console.log(`\n🎉 Completed in ${(totalTime / 1000).toFixed(2)}s — ${cps.toLocaleString()} cells/sec`);
    console.log(`🎯 Under 15s?  ${totalTime < 15000 ? '✅ YES' : '❌ NO'}`);
  });
}



// export async function overwriteUltraTuned(rows, sheetName = "Report Genie Backend", tableName = "Table7") {
//   // 1) Pre-compute everything outside Excel.run
//   const bodyRows = rows.slice(1);
//   const [totalRows, totalCols] = [bodyRows.length, bodyRows[0]?.length || 0];
//   const totalCells = totalRows * totalCols;

//   // calibrate chunk so each takes ~600ms
//   const msPerCell = await measureMsPerCell(); // implement a one-time probe
//   const cellsPerBatch = 600 / msPerCell;
//   const optimalRows = Math.max(1, Math.floor(cellsPerBatch / totalCols));

//   await Excel.run(async ctx => {
//     // 2) Maximize host performance
//     ctx.application.suspendScreenUpdatingUntilNextSync();
//     ctx.application.calculationMode = Excel.CalculationMode.manual;
//     ctx.application.suspendApiCalculationUntilNextSync();

//     // 3) Single load
//     const ws = ctx.workbook.worksheets.getItemOrNullObject(sheetName);        
//     const table = ctx.workbook.tables.getItem(tableName);
//     const header = table.getHeaderRowRange().load(["rowIndex","columnIndex"]);
//     const bodyRange = table.getDataBodyRange().load(["rowCount"]);
//     await ctx.sync();

//     // 4) Create sheet if missing
//     if (ws.isNullObject) ctx.workbook.worksheets.add(sheetName);

//     // 5) Only clear if sizes match
//     if (!bodyRange.isNullObject && bodyRange.rowCount === totalRows) {
//       bodyRange.clear(Excel.ClearApplyTo.contents);
//     }

//     // 6) Write in one shot if small, else in calibrated chunks
//     const [R0, C0] = [header.rowIndex+1, header.columnIndex];
//     if (totalCells <= cellsPerBatch) {
//       ws.getRangeByIndexes(R0, C0, totalRows, totalCols).values = bodyRows;
//     } else {
//       for (let i = 0; i < totalRows; i += optimalRows) {
//         const chunkSize = Math.min(optimalRows, totalRows - i);
//         ws.getRangeByIndexes(R0 + i, C0, chunkSize, totalCols).values = bodyRows.slice(i, i + chunkSize);
//       }
//     }

//     // 7) Resize only if needed
//     if (bodyRange.rowCount !== totalRows) {
//       const newRange = ws.getRangeByIndexes(header.rowIndex, C0, totalRows + 1, totalCols);
//       table.resize(newRange);
//     }

//     // 8) Single final sync
//     await ctx.sync();

//     // 9) Restore
//     ctx.application.calculationMode = Excel.CalculationMode.automatic;
//   });
// }


/**
 * Convert an ArrayBuffer (or Uint8Array) into a Base64 string.
 *//**
* Convert an ArrayBuffer (or Uint8Array) into a Base64 string.
*/
/**
 * Convert an ArrayBuffer into a Base64 string.
 *//**
* Convert an ArrayBuffer (or Uint8Array) into a Base64 string.
*/
function arrayBufferToBase64(buffer) {
  var bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  var binary = "";
  for (var i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  var b64 = window.btoa(binary);
  console.log(
    "🔍 [arrayBufferToBase64] input bytes:",
    bytes.byteLength,
    "→ base64 length:",
    b64.length,
    "sample:",
    b64.slice(0, 50) + "…"
  );
  return b64;
}

/**
 * Download an .xlsx from S3 and drop in all its sheets, with detailed logging.
 */function importCsvToSheet(s3Url, sheetName = "ImportedCSV") {
  fetch(s3Url)
    .then(resp => {
      if (!resp.ok) throw new Error(resp.statusText);
      return resp.text();
    })
    .then(csvText => {
      // 1) Split into rows and columns
      const rows = csvText.trim().split("\n").map(r => r.split(","));
      return Excel.run(ctx => {
        // 2) Add or clear target sheet
        let ws = ctx.workbook.worksheets.getItemOrNullObject(sheetName);
        ws.load("isNullObject");
        return ctx.sync()
          .then(() => {
            if (ws.isNullObject) {
              ws = ctx.workbook.worksheets.add(sheetName);
            } else {
              ws.getUsedRange().clear(Excel.ClearApplyTo.all);
            }
            // 3) Write the array in one go
            const writeRange = ws.getRangeByIndexes(0, 0, rows.length, rows[0].length);
            writeRange.values = rows;
          })
          .then(() => ctx.sync());
      });
    })
    .catch(err => console.error("CSV import failed:", err));
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// async function writeUrlToNamedRange(newUrl) {
//   try {
//     await Excel.run(async (ctx) => {
//       // 1) Grab the Name object for "MYURL"
//       const namedItem = ctx.workbook.names.getItem("MYURL");
//       namedItem.load("name"); // just to ensure it exists
//       await ctx.sync();

//       // 2) Get the Range that the name refers to
//       const targetRange = namedItem.getRange();
//       // 3) Write your URL into that range (one cell)
//       targetRange.values = [[ newUrl ]];

//       // 4) Sync back to Excel
//       await ctx.sync();
//       console.log(`✅ Wrote "${newUrl}" to named range MYURL`);
//     });
//   } catch (error) {
//     console.error("❌ Failed to write to MYURL:", error);
//   }
// }


// async function refreshAllDataConnections() {
//   try {
//     await Excel.run(async (ctx) => {
//       console.log("🔄 Refreshing all data connections...");
//       ctx.workbook.dataConnections.refreshAll();  // API set: ExcelApi 1.7 :contentReference[oaicite:0]{index=0}
//       await ctx.sync();
//       console.log("✅ All data connections have been refreshed.");
//     });
//   } catch (error) {
//     console.error("❌ Error refreshing data connections:", error);
//   }
// }


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


/**
 * Write a new URL to MYURL, refresh all connections, 
 * and wait until the target table has been updated.
 *
 * @param {string} newUrl      The pre‐signed URL to load.
 * @param {string} tableName   The name of the table your PQ query loads into.
 * @param {number} [timeout=60] How many seconds to wait before giving up.
 * @returns {Promise<string>}  Resolves "Success" when data arrives, rejects on error/timeout.
 */
function updateUrlAndWaitForRefresh(newUrl, tableName, timeout = 500) {
  console.log("🚀 [Flow] Starting updateUrlAndWaitForRefresh");
  let writeStep = "not started";
  let refreshStep = "not started";

  // STEP 1: Write the URL
  return Excel.run(async ctx => {
    writeStep = "getting named range";
    console.log(`📌 [Step: ${writeStep}]`);
    const namedItem = ctx.workbook.names.getItem("MYURL");
    namedItem.load("name");
    await ctx.sync();

    writeStep = "writing new URL into named range";
    console.log(`📌 [Step: ${writeStep}] value=`, newUrl);
    const range = namedItem.getRange();
    range.values = [[newUrl]];
    await ctx.sync();

    writeStep = "url written successfully";
    console.log(`✅ [Step: ${writeStep}]`);
  })
    .catch(err => {
      console.error(`❌ [Error in write step: ${writeStep}]`, {
        code: err.code || "(no code)",
        message: err.message,
        stack: err.stack
      });
      throw err;       // propagate to outer Promise
    })
    // STEP 2+3: Refresh and wait for table change
    .then(() => {
      return new Promise((resolve, reject) => {
        let pollCount = 0;
        const maxPolls = Math.ceil(timeout * 1000 / 500);

        Excel.run(async ctx => {
          refreshStep = "getting table object";
          console.log(`📌 [Step: ${refreshStep}] tableName=${tableName}`);
          const tbl = ctx.workbook.tables.getItem(tableName);
          tbl.load("name");
          await ctx.sync();

          refreshStep = "registering onChanged handler";
          console.log(`📌 [Step: ${refreshStep}]`);
          const handler = tbl.onChanged.add(async event => {
            handler.remove();
            await ctx.sync();
            console.log("✅ [Event] table.onChanged fired:", event);
            resolve("Success");
          });

          refreshStep = "triggering dataConnections.refreshAll()";
          console.log(`📌 [Step: ${refreshStep}]`);
          ctx.workbook.dataConnections.refreshAll();
          await ctx.sync();
          console.log("🔄 [Step done] refreshAll queued");
        })
          .catch(err => {
            console.error(`❌ [Error in refresh step: ${refreshStep}]`, {
              code: err.code || "(no code)",
              message: err.message,
              stack: err.stack
            });
            reject(err);
          });

        // Fallback timeout if no event arrives
        const ticker = setInterval(() => {
          pollCount++;
          if (pollCount >= maxPolls) {
            clearInterval(ticker);
            console.error("❌ [Timeout] No table.onChanged after", timeout, "s");
            reject(new Error(`Timeout waiting ${timeout}s for ${tableName} update`));
          }
        }, 500);
      });
    });
}

/**
 * Writes the selected cycle, scenario and save-status into a single named-range cell,
 * each on its own line.
 *
 * @param {string} namedRange The name of a single-cell named range in your workbook
 * @param {string} cycle      The selected cycle value
 * @param {string} scenario   The selected scenario value
 * @param {string} status     The selected saveStatus value
 */
export async function writeMetadataToNamedCell(namedRange, cycle, scenario, status) {
  try {
    await Excel.run(async (context) => {
      // grab the named range
      var namedItem = context.workbook.names.getItem(namedRange);
      var cell = namedItem.getRange();

      // build a single text blob with line breaks
      var text =
        "Cycle Name: " + cycle + "\n" +
        "Scenario Name: " + scenario + "\n" +
        "Save Status: " + status;

      // write into the one cell
      cell.values = [[text]];

      // enable text wrapping so you see the line breaks
      cell.format.wrapText = true;

      await context.sync();
    });
  } catch (error) {
    console.error("Error writing metadata to \"" + namedRange + "\":", error);
  }
}
function updateUrlInNamedRange(newUrl) {
  return Excel.run(async (ctx) => {
    try {
      // STEP: get the named range called "MYURL"
      const namedItem = ctx.workbook.names.getItem("MYURL");
      const range = namedItem.getRange();

      // STEP: write the new URL
      range.values = [[newUrl]];
      await ctx.sync();

      console.log("✅ URL written into named range MYURL:", newUrl);
    } catch (err) {
      console.error("❌ Failed to write URL into named range:", {
        code: err.code || "(no code)",
        message: err.message,
        stack: err.stack,
      });
      throw err;
    }
  });
}