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
    // COGNITO: {
    //   URL: "https://cognito-idp.us-east-1.amazonaws.com/",
    //   CLIENT_ID: "47ht7bakkhf3k89enj23581vcd",
    // },
    // AUTH_URL: "https://tj67lue8y7.execute-api.us-east-1.amazonaws.com/dev/sqldbquery",
    // AWS_SECRETS_NAME: "dsivis-dev-remaining-secret",
    // POLLING: {
    //   MAX_ATTEMPTS: 100,
    //   DELAY_MS: 5000,
    // },
    // UPLOAD: {
    //   CHUNK_SIZE: 50000,
    //   COMPRESSION_LEVEL: 4,
    // },
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
    Connection: "keep-alive",
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
    throw error;
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
  LongformData,
  outputbackend_data = [],
  sheetNames_Agg = [],
  constituent_ID = [],
  matchedForecasts = [],
  setPageValue
) {
  console.log(`🚀 Service orchestration started: ${buttonname}`);

  try {
    const username = localStorage.getItem("username");
    const idToken = localStorage.getItem("idToken");
    const User_Id = parseInt(localStorage.getItem("User_ID"), 10);

    let AWSsecrets = await AuthorizationData("FETCH_METADATA", idToken, CONFIG.AWS_SECRETS_NAME, username);
    if (AWSsecrets?.message === "The incoming token has expired") {
      console.warn("🔄 Token expired, refreshing...");
      await AWSrefreshtoken();
      AWSsecrets = await AuthorizationData("FETCH_METADATA", idToken, CONFIG.AWS_SECRETS_NAME, username);
    }

    if (!AWSsecrets || !AWSsecrets.results) {
      throw new Error("❌ Failed to retrieve AWS secrets");
    }

    const UUID_Generated = [uuidv4()];
    const secretsObject = AWSsecrets.results[CONFIG.AWS_SECRETS_NAME];
    const serviceorg_URL = secretsObject.ServOrch;
    const pollingUrl = secretsObject.Polling;

    if (buttonname === "SAVE_FORECAST" || buttonname === "SAVE_LOCKED_FORECAST") {
      console.log("📤 Preparing forecast upload");
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
        const sheetName = sheetNames_Agg[i] || `Sheet_${i + 1}`; // Fallback in case name is missing

        try {
          await AggDownloadS3(url, sheetName);
          const progress = Math.round(((i + 1) / totalFiles) * 100);
          setPageValue("LoadingCircleComponent", `${progress}% | Loading Models...`);
          console.log(`✅ Downloaded: ${sheetName}`);
        } catch (error) {
          console.error(`❌ Error downloading ${sheetName}:`, error);
        }
      }

      await pasteArrayToNamedRange(constituent_ID, "Imported_model_List");

      console.log("✅ All downloads completed.");
      return { status: "success", message: "Aggregated models downloaded." };
    } else if (buttonname === "SAVE_FORECAST_AGG" || buttonname === "SAVE_LOCKED_FORECAST_AGG") {
      const buttonMapping = {
        SAVE_FORECAST_AGG: "SAVE_FORECAST",
        SAVE_LOCKED_FORECAST_AGG: "SAVE_LOCKED_FORECAST",
      };
      // Derive the mapped button name
      const mappedButtonName = buttonMapping[buttonname] || buttonname;
      console.log("Forecast Aggregation Button Mapping:", buttonMapping);
      console.log("Mapped Button Name:", mappedButtonName);

      // (Assume earlier code prepares S3 upload URLs)
      const S3Uploadobejct = await AuthorizationData(
        "SAVE_FORECAST",
        idToken,
        CONFIG.AWS_SECRETS_NAME,
        username,
        UUID_Generated
      );

      const UploadS3SaveForecastURL = S3Uploadobejct["presigned urls"]["UPLOAD"]["SAVE_FORECAST"][UUID_Generated[0]];
      const UploadS3INPUTFILEURL = S3Uploadobejct["presigned urls"]["UPLOAD"]["INPUT_FILE"][UUID_Generated[0]];

      const [flag_flatfileupload, flat_inputfileupload] = await Promise.all([
        uploadFileToS3FromArray(LongformData, "Test", UploadS3SaveForecastURL),
        uploadFileToS3("Input File", UploadS3INPUTFILEURL),
      ]);

      console.log(`🟢 Uploads completed - Forecast: ${flag_flatfileupload}, Input: ${flat_inputfileupload}`);

      if (flag_flatfileupload || flat_inputfileupload) {
        // Original service request call
        const servicestatus = await servicerequest(
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
        console.log("Service status:", servicestatus);
        let pollingResult = servicestatus;
        if (servicestatus === "Endpoint request timed out" || (servicestatus && servicestatus.status === "Poll")) {
          console.log("⏱️ Service request requires polling");
          pollingResult = await poll(UUID_Generated[0], CONFIG.AWS_SECRETS_NAME, pollingUrl, idToken);
        }
        

        // Now, for each element in matchedForecasts, send a service request
        if (buttonname === "SAVE_LOCKED_FORECAST_AGG") {
          let completedCount = 0;
          const totalCount = matchedForecasts?.length || 0;
        
          for (const [index, match] of matchedForecasts.entries()) {
            try {
              const newUUID = match.forecast_id.replace("forecast_", "");
              const newModelUUID = match.model_id;
              const UUID_Generated = [uuidv4()];
        
              const matchStatus = await servicerequest(
                serviceorg_URL,
                "LOCK_FORECAST",
                UUID_Generated[0],
                "",
                idToken,
                CONFIG.AWS_SECRETS_NAME,
                User_Id,
                "",
                "",
                [],
                newUUID
              );
        
              console.log(`Service status for matched forecast ${match.forecast_id}:`, matchStatus);
        
              let success = false;
        
              if (matchStatus === "Forecast is already locked" || matchStatus === "Forecast locked successfully") {
                success = true;
              }
        
              if (matchStatus === "Endpoint request timed out" || (matchStatus && matchStatus.status === "Poll")) {
                console.log("⏱️ Service request requires polling");
                await poll(newUUID, CONFIG.AWS_SECRETS_NAME, pollingUrl, idToken);
                success = true;
              }
        
              if (success) {
                completedCount++;
                const progressPercent = 60 + Math.round((completedCount / totalCount) * 30); // max 90%
                setPageValue("LoadingCircleComponent", `${progressPercent}% | Saving your forecast...`);
              }
        
            } catch (error) {
              console.error("Error processing matched forecast", match, error);
            }
          }
        }

        // If the original service request requires polling, handle that.

        return pollingResult;
      }
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
  try {
    return await Excel.run(async (context) => {
      console.time("⏱️ Total upload execution");
      const sheet = context.workbook.worksheets.getItem(sheetName);
      const range = sheet.getUsedRange();
      range.load("values");
      console.time("⏱️ Data loading");
      await context.sync();
      console.timeEnd("⏱️ Data loading");

      const values = range.values;
      if (!values || values.length === 0) {
        console.error("🚨 No data found in the worksheet");
        return false;
      }
      console.log(`📊 Processing ${values.length} rows × ${values[0].length} columns`);

      console.time("⏱️ CSV creation");
      const csvLines = values.map((row) =>
        row
          .map((cell) => {
            if (cell === null || cell === undefined) return "";
            const cellStr = String(cell);
            return /[,"\n]/.test(cellStr) ? `"${cellStr.replace(/"/g, '""')}"` : cellStr;
          })
          .join(",")
      );
      const csvContent = csvLines.join("\n");
      console.timeEnd("⏱️ CSV creation");

      const blob = new Blob([csvContent], { type: "text/csv" });
      console.log(`📦 Blob size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`);

      console.time("⏱️ Upload");
      const response = await fetch(uploadURL, {
        method: "PUT",
        headers: {
          "Content-Type": "text/csv",
          "x-amz-acl": "bucket-owner-full-control",
          "Cache-Control": "no-cache",
        },
        body: blob,
      });
      console.timeEnd("⏱️ Upload");
      console.timeEnd("⏱️ Total upload execution");

      if (response.ok) {
        console.log("✅ File uploaded successfully");
        return true;
      } else {
        console.error("❌ Upload failed:", response.status, await response.text());
        return false;
      }
    });
  } catch (error) {
    console.error("🚨 Upload error:", error);
    return false;
  }
}

/**
 * Downloads an Excel file from S3 and inserts its data into a target Excel sheet.
 * @param {string} s3Url - S3 URL of the Excel file.
 * @param {string} sheetName - Target Excel sheet name.
 * @returns {Promise<object>} - Success status and sheet name.
 */
export async function downloadAndInsertDataFromExcel(s3Url, sheetName) {
  const downloadURL = s3Url;

  async function fetchData() {
    console.log("📥 Fetching file from S3");
    const response = await fetch(downloadURL);
    if (!response.ok) {
      throw new Error(`❌ File fetch failed: ${response.statusText}`);
    }
    console.log("✅ File fetched successfully");
    return response.arrayBuffer();
  }

  async function processExcelFile(arrayBuffer, sheetName) {
    console.log("⚙️ Processing Excel file");
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    let rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (rows.length === 0) {
      throw new Error("❌ Excel sheet is empty");
    }

    // Normalize rows to ensure each row has the same number of columns
    const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0);
    rows = rows.map((row) => {
      if (row.length < maxCols) {
        // Append empty strings until row length equals maxCols
        return [...row, ...Array(maxCols - row.length).fill("")];
      }
      return row;
    });

    await insertParsedData(rows, sheetName);
  }

  function getColumnLetter(index) {
    let letter = "";
    let tempIndex = index;
    while (tempIndex >= 0) {
      letter = String.fromCharCode((tempIndex % 26) + 65) + letter;
      tempIndex = Math.floor(tempIndex / 26) - 1;
    }
    return letter;
  }

  async function insertParsedData(rows, sheetName) {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getItemOrNullObject(sheetName);
      await context.sync();
      if (sheet.isNullObject) {
        throw new Error(`❌ Sheet "${sheetName}" not found`);
      }
      sheet.getUsedRange().clear();
      await context.sync();
      // Recalculate max columns in case normalization adjusted the row lengths
      const maxCols = rows[0].length;
      const rangeAddress = `A1:${getColumnLetter(maxCols - 1)}${rows.length}`;
      console.log(`📊 Target range: ${rangeAddress}`);
      try {
        const range = sheet.getRange(rangeAddress);
        range.values = rows;
        await context.sync();
        console.log(`✅ Data inserted into "${sheetName}"`);
      } catch (error) {
        console.error("❌ Data insertion error:", error);
        throw new Error("❌ Invalid range or sheet");
      }
    });
  }

  try {
    console.log("🚀 Starting download and insertion process");
    const arrayBuffer = await fetchData();
    await processExcelFile(arrayBuffer, sheetName);
    console.log("✅ Process completed successfully");
    return { success: true, newSheetName: sheetName };
  } catch (error) {
    console.error("🚨 Download and insertion error:", error);
    return { success: false, newSheetName: null };
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
                ? '"' + cellStr.replace(/"/g, '""') + '"'
                : cellStr;
            })
            .join(",");
          chunkContent += rowString + "\n";
        }
        csvContent += chunkContent;
      }
      blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      contentType = "text/csv";
      console.timeEnd("⏱️ CSV creation");
    } else {
      const useWorker = typeof Worker !== "undefined" && rowCount * colCount > 100000;
      if (useWorker) {
        console.time("⏱️ Worker processing");
        blob = await createExcelBlobInWorker(dataArray, fileName.replace(/\.(xlsx|csv)$/i, ""));
        console.timeEnd("⏱️ Worker processing");
      } else {
        console.time("⏱️ Workbook creation");
        const ws = {};
        const range = { s: { c: 0, r: 0 }, e: { c: colCount - 1, r: rowCount - 1 } };
        ws["!ref"] = XLSX.utils.encode_range(range);
        for (let R = 0; R < rowCount; ++R) {
          for (let C = 0; C < colCount; ++C) {
            const cell_ref = XLSX.utils.encode_cell({ c: C, r: R });
            const cellValue = dataArray[R][C];
            if (cellValue == null) continue;
            if (typeof cellValue === "number") {
              ws[cell_ref] = { v: cellValue, t: "n" };
            } else if (typeof cellValue === "boolean") {
              ws[cell_ref] = { v: cellValue, t: "b" };
            } else if (cellValue instanceof Date) {
              ws[cell_ref] = { v: cellValue, t: "d" };
            } else {
              ws[cell_ref] = { v: cellValue, t: "s" };
            }
          }
        }
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, fileName.replace(/\.(xlsx|csv)$/i, ""));
        console.timeEnd("⏱️ Workbook creation");

        console.time("⏱️ Blob creation");
        const binaryString = XLSX.write(wb, {
          bookType: "xlsx",
          type: "binary",
          compression: true,
          compressionOptions: { level: CONFIG.UPLOAD.COMPRESSION_LEVEL },
        });
        const buf = new ArrayBuffer(binaryString.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < binaryString.length; i++) {
          view[i] = binaryString.charCodeAt(i) & 0xff;
        }
        blob = new Blob([buf], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        // Clean up memory
        for (let key in ws) {
          ws[key] = null;
        }
        console.timeEnd("⏱️ Blob creation");
      }
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }

    console.log(`📤 Uploading ${(blob.size / (1024 * 1024)).toFixed(2)} MB to: ${uploadURL}`);
    console.time("⏱️ Upload");
    const response = await fetch(uploadURL, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "x-amz-acl": "bucket-owner-full-control",
        "Cache-Control": "no-cache",
      },
      body: blob,
    });
    console.timeEnd("⏱️ Upload");
    console.timeEnd("⏱️ Total array upload");

    if (response.ok) {
      console.log(`✅ File uploaded successfully. Size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`);
      return true;
    } else {
      console.error(`❌ Error uploading file. Status: ${response.status}`, await response.text());
      return false;
    }
  } catch (error) {
    console.error("🚨 Error in uploadFileToS3FromArray:", error);
    return false;
  } finally {
    // Hint for garbage collection if available
    if (typeof global !== "undefined" && global.gc) {
      global.gc();
    }
  }
}


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
      console.log(`🔄 Polling attempt ${attempts + 1}: ${responseBody.status}`);

      if (responseBody.status === "DONE") {
        console.log("✅ Operation completed successfully");
        return { request_id, result: responseBody.status };
      } else if (responseBody.status === "PENDING") {
        console.log(`⏳ Operation still in progress, waiting ${delay / 1000}s`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempts++;
      } else {
        console.error(`❌ Unexpected polling status: ${responseBody.status}`);
        return { request_id, result: responseBody.status };
      }
    } catch (error) {
      console.error("🚨 Polling error:", error);
      return { request_id, result: responseBody?.status || "ERROR" };
    }
  }

  console.error(`⏱️ Polling timed out after ${maxAttempts} attempts`);
  return { request_id, result: responseBody?.status || "TIMEOUT" };
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

  async function fetchData() {
    console.log("📥 Fetching file from S3");
    const response = await fetch(downloadURL);
    if (!response.ok) {
      throw new Error(`❌ File fetch failed: ${response.statusText}`);
    }
    console.log("✅ File fetched successfully");
    return response.arrayBuffer();
  }

  async function processExcelFile(arrayBuffer, sheetName, startCell) {
    console.log("⚙️ Processing Excel file");
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    let rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (rows.length === 0) {
      throw new Error("❌ Excel sheet is empty");
    }

    // Normalize rows so each row has the same number of columns
    const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0);
    rows = rows.map((row) => {
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
    const columnLetter = match[1];
    const rowNumber = parseInt(match[2], 10);

    // Convert column letter to zero-indexed column index
    let columnIndex = 0;
    for (let i = 0; i < columnLetter.length; i++) {
      columnIndex = columnIndex * 26 + (columnLetter.charCodeAt(i) - 65 + 1);
    }

    return { columnIndex: columnIndex - 1, rowIndex: rowNumber - 1 };
  }

  function getColumnLetter(index) {
    let letter = "";
    let tempIndex = index;
    while (tempIndex >= 0) {
      letter = String.fromCharCode((tempIndex % 26) + 65) + letter;
      tempIndex = Math.floor(tempIndex / 26) - 1;
    }
    return letter;
  }

  async function insertParsedData(rows, sheetName, startCell) {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getItemOrNullObject(sheetName);
      await context.sync();
      if (sheet.isNullObject) {
        throw new Error(`❌ Sheet "${sheetName}" not found`);
      }

      // Parse startCell (e.g., B4) into zero-indexed row and column
      const { columnIndex, rowIndex } = parseCellReference(startCell);
      const maxCols = rows[0].length;
      const endColumnIndex = columnIndex + maxCols - 1;
      const endRowIndex = rowIndex + rows.length - 1;

      // Construct the target range address (Excel row numbers are 1-indexed)
      const rangeAddress = `${startCell}:${getColumnLetter(endColumnIndex)}${endRowIndex + 1}`;
      console.log(`📊 Target range: ${rangeAddress}`);

      // Get the target range and clear only the cell contents (values)
      const targetRange = sheet.getRange(rangeAddress);
      targetRange.clear(Excel.ClearApplyTo.contents);
      await context.sync();

      // Now insert the data
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

async function pasteArrayToNamedRange(arrayData, namedRangeName) {
  await Excel.run(async (context) => {
    // Get the named range
    const namedRange = context.workbook.names.getItem(namedRangeName).getRange();
    namedRange.load(["rowCount", "columnCount"]);
    await context.sync();

    const expectedRows = namedRange.rowCount;
    const expectedCols = namedRange.columnCount;

    // Auto-convert 1D array to 2D (Nx1) if needed
    if (!Array.isArray(arrayData[0])) {
      arrayData = arrayData.map((item) => [item]);
    }

    const inputRows = arrayData.length;
    const inputCols = arrayData[0]?.length || 0;

    // Check if dimensions match
    if (inputRows !== expectedRows || inputCols !== expectedCols) {
      console.error(
        `Input array dimensions (${inputRows}x${inputCols}) do not match named range dimensions (${expectedRows}x${expectedCols}).`
      );
      return;
    }

    // Paste values
    namedRange.values = arrayData;
    await context.sync();

    console.log(`✅ Data successfully pasted into named range "${namedRangeName}".`);
  }).catch((error) => {
    console.error("❌ Error: " + error);
  });
}

export const sync_MetaData_AGG = async (setPageValue) => {
  console.log("Update Actuals button clicked");
  setPageValue("LoadingCircleComponent", "Syncing data...");

  try {
    const responseBody = await FetchMetaData(
      "FETCH_METADATA",
      localStorage.getItem("idToken"),
      "dsivis-dev-remaining-secret",
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
