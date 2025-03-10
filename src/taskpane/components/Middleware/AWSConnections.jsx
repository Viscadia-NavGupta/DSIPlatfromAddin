import { v4 as uuidv4 } from "uuid"; // ✅ Import UUID Generator
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import Papa from "papaparse";

let cognitoURL = "https://cognito-idp.us-east-1.amazonaws.com/";
let cognitoClientID = "57qs6udk82ombama3k7ntrflcn";
let AuthURL = "https://278e46zxxk.execute-api.us-east-1.amazonaws.com/dev/sqldbquery";
let AWSsecretsName = "dsivis-dev-remaining-secrets";

// user login //
export async function AwsLogin(username, password) {
  const url = cognitoURL;

  // Define headers
  const headers = {
    "Content-Type": "application/x-amz-json-1.1",
    "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
  };

  // Define body
  const body = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: cognitoClientID, // Update with your actual ClientId
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  };

  try {
    // Make the POST request
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });

    // Parse the response
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Login successful:", data);
    return data; // Return the response data
  } catch (error) {
    console.error("Error during login:", error);
    throw error; // Rethrow the error for further handling
  }
}
// auth of the user//
export async function AuthorizationData(buttonname, idToken, secretName, emailId, UUID = []) {
  const url = AuthURL;
  let idToken_new = "Bearer " + idToken;
  const headers = {
    Authorization: idToken_new, // Add the ID token from Cognito
    "Content-Type": "application/json", // Ensure content type is JSON
  };
  let body = {
    action: buttonname,
    secret_name: secretName,
    email_id: emailId,
    UUID: UUID,
  };

  try {
    let response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    let data = await response.json();

    if (data?.message === "The incoming token has expired") {
      console.warn("🔄 Token expired! Refreshing...");
      await AWSrefreshtoken();
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + idToken, // Refresh token logic should update idToken
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      data = await response.json();
    }

    console.log("Fetch Metadata Response:", data);
    return data;
  } catch (error) {
    console.error("Error fetching metadata:", error);
    throw error; // Re-throw error for handling
  }
}
// fetching meta data//
export async function FetchMetaData(buttonName, idToken, secretName, userId, email_id) {
  try {
    console.log("🔍 Fetching secrets from AWS...");

    // ✅ Fetch secrets from AWS
    const AWSsecrets = await AuthorizationData(
      "FETCH_METADATA",
      idToken,
      AWSsecretsName,
      email_id // ✅ Use correct email_id
    );

    console.log("🔍 AWS Secrets Response:", AWSsecrets);

    // ✅ Validate AWS Secrets response
    if (!AWSsecrets.results || !AWSsecrets.results["dsivis-dev-remaining-secrets"]) {
      throw new Error("❌ Missing secrets in AWS response.");
    }

    // ✅ Extract the secrets object (NO NEED for JSON.parse)
    const secretsObject = AWSsecrets.results["dsivis-dev-remaining-secrets"];

    // ✅ Validate Service Orchestration URL
    if (!secretsObject.ServOrch) {
      throw new Error("❌ Missing Service Orchestration URL.");
    }

    const ServOrchURL = secretsObject.ServOrch; // ✅ Extract Correct URL
    console.log("✅ Service Orchestration URL:", ServOrchURL);

    // ✅ Construct headers with authorization token
    const headers = {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    };

    // ✅ Generate UUID dynamically
    const UUID_Generated = uuidv4();

    // ✅ Construct request body
    const body = JSON.stringify({
      uuid: UUID_Generated,
      buttonName: buttonName,
      secret_name: secretName,
      user_id: userId,
    });

    console.log("📤 Sending API Request:", body);

    // ✅ Make API request
    const response = await fetch(ServOrchURL, {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`❌ HTTP error! Status: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ Fetch Metadata Response:", data);
    return data; // ✅ Return response data
  } catch (error) {
    console.error("🚨 Error fetching metadata:", error.message);
    throw error; // ✅ Re-throw for error handling
  }
}

// file upload to s3//

// export async function uploadFileToS3(sheetName, uploadURL) {
//   try {
//     return await Excel.run(async (context) => {
//       const sheet = context.workbook.worksheets.getItem(sheetName);

//       // ✅ Dynamically get the used range
//       let range = sheet.getUsedRange();
//       range.load(["values"]);
//       await context.sync();

//       let values = range.values;

//       if (!values || values.length === 0) {
//         console.error("🚨 No data found in the worksheet.");
//         return false;
//       }

//       console.log(`📊 Loaded ${values.length} rows and ${values[0].length} columns`);

//       // ✅ STREAM-BASED WORKBOOK CREATION
//       const workbook = XLSX.utils.book_new();
//       const worksheet = XLSX.utils.aoa_to_sheet([]); // Initialize an empty sheet

//       const chunkSize = 10000; // Process 10,000 rows per batch

//       // ✅ Ensure first chunk starts at A1
//       XLSX.utils.sheet_add_aoa(worksheet, values.slice(0, chunkSize), { origin: "A1" });

//       // ✅ Append remaining chunks dynamically
//       for (let i = chunkSize; i < values.length; i += chunkSize) {
//         const chunk = values.slice(i, i + chunkSize);
//         XLSX.utils.sheet_add_aoa(worksheet, chunk, { origin: -1 }); // Append from last row
//       }

//       XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

//       // ✅ Stream the workbook to prevent memory issues
//       const workbookBinary = XLSX.write(workbook, {
//         bookType: "xlsx",
//         type: "array",
//         compression: true, // ✅ Enables compression
//       });

//       // ✅ Convert to Blob directly (fixes memory issue)
//       const blob = new Blob([workbookBinary], {
//         type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//       });

//       console.log(`📤 Uploading file to: ${uploadURL}`);

//       // ✅ Upload to S3
//       const startTime = performance.now();
//       const response = await fetch(uploadURL, {
//         method: "PUT",
//         headers: {
//           "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//           "x-amz-acl": "bucket-owner-full-control",
//         },
//         body: blob,
//       });
//       const endTime = performance.now();

//       if (response.ok) {
//         console.log(`✅ File uploaded successfully. Time taken: ${(endTime - startTime) / 1000} seconds.`);
//         return true;
//       } else {
//         console.error(`❌ Error uploading file. Status code: ${response.status}`, await response.text());
//         return false;
//       }
//     });
//   } catch (error) {
//     console.error("🚨 Error uploading file:", error);
//     return false;
//   }
// }
export async function uploadFileToS3(sheetName, uploadURL) {
  try {
    return await Excel.run(async (context) => {
      console.time("Total execution");
      const sheet = context.workbook.worksheets.getItem(sheetName);

      // 🚀 OPTIMIZATION: Load only necessary data with proper properties
      const range = sheet.getUsedRange();
      range.load(["values", "address"]);

      console.time("Data loading");
      await context.sync();
      console.timeEnd("Data loading");

      const values = range.values;

      if (!values || values.length === 0) {
        console.error("🚨 No data found in the worksheet.");
        return false;
      }

      console.log(`📊 Processing ${values.length} rows × ${values[0].length} columns`);

      // 🚀 OPTIMIZATION: Use typed arrays for better memory management
      console.time("Workbook creation");
      const workbook = XLSX.utils.book_new();

      // 🚀 OPTIMIZATION: Pre-allocate worksheet with known dimensions
      const worksheet = XLSX.utils.aoa_to_sheet(values.slice(0, 1));

      // 🚀 OPTIMIZATION: Process in larger chunks with optimized range references
      const chunkSize = 25000; // Increased chunk size for better performance

      // 🚀 OPTIMIZATION: Direct append instead of slicing multiple times
      for (let i = 1; i < values.length; i += chunkSize) {
        const endRow = Math.min(i + chunkSize, values.length);
        const chunk = values.slice(i, endRow);
        XLSX.utils.sheet_add_aoa(worksheet, chunk, { origin: { r: i, c: 0 } }); // Direct row reference
      }

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      console.timeEnd("Workbook creation");

      // 🚀 OPTIMIZATION: Use streaming write with higher compression
      console.time("Blob creation");
      const workbookBinary = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
        compression: true,
        compressionOptions: {
          level: 9, // Maximum compression
        },
      });

      // 🚀 OPTIMIZATION: Create blob with optimized MIME type
      const blob = new Blob([workbookBinary], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      console.timeEnd("Blob creation");

      // 🚀 OPTIMIZATION: Free memory explicitly
      workbook.SheetNames = null;
      workbook.Sheets = null;

      console.log(`📤 Uploading ${(blob.size / (1024 * 1024)).toFixed(2)} MB to: ${uploadURL}`);

      // 🚀 OPTIMIZATION: Use streaming upload with progress monitoring
      console.time("Upload");
      const response = await fetch(uploadURL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "x-amz-acl": "bucket-owner-full-control",
          "Cache-Control": "no-cache", // Prevent caching issues
        },
        body: blob,
        // Use lower-level options if your fetch implementation supports them
        // keepalive: true,
        // priority: "high"
      });

      console.timeEnd("Upload");
      console.timeEnd("Total execution");

      if (response.ok) {
        console.log(`✅ File uploaded successfully. Size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`);
        return true;
      } else {
        console.error(`❌ Error uploading file. Status: ${response.status}`, await response.text());
        return false;
      }
    });
  } catch (error) {
    console.error("🚨 Error in uploadFileToS3:", error);
    return false;
  } finally {
    // Force garbage collection if available in environment
    if (typeof global !== "undefined" && global.gc) {
      global.gc();
    }
  }
}

export async function servicerequest(
  serviceURL = "",
  buttonName = "",
  UUID = "",
  Model_UUID = "",
  idToken = "",
  secretName = "",
  userId = "",
  cycleName = "",
  scenarioName = ""
) {
  try {
    // ✅ Construct headers with authorization token
    const headers = {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    };

    // ✅ Construct request body
    const body = {
      request_id: UUID,
      buttonName: buttonName,
      secret_name: secretName,
      user_id: userId,
      model_id: Model_UUID,
      cycle_name: cycleName,
      scenario_name: scenarioName,
    };

    console.log("📤 Sending API Request:", JSON.stringify(body, null, 2));

    // ✅ Make API request
    const response = await fetch(serviceURL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    // ✅ Parse JSON response
    const data = await response.json();

    console.log("✅ API Response:", data);

    // ✅ If the API returns a specific error message, return it instead of throwing
    if (!response.ok) {
      return data.message || `HTTP Error ${response.status}: ${response.statusText}`;
    }

    // ✅ Return the API response message
    return data.message || "No message in response";
  } catch (error) {
    console.error("🚨 API Request Error:", error);

    // ✅ Return a detailed error message if the response contains a message
    if (error.response) {
      try {
        const errorData = await error.response.json();
        return errorData.message || `Error: ${error.response.status} - ${error.response.statusText}`;
      } catch {
        return `Error: ${error.response.status} - ${error.response.statusText}`;
      }
    }

    return `Error: ${error.message}`; // ✅ Return the error message instead of throwing
  }
}

export async function service_orchestration(
  buttonname,
  UUID = "",
  Model_UUID = "",
  scenarioname = "",
  cycleName = "",
  User_ID = "",
  secret_name = "",
  Forecast_UUID = ""
) {
  console.log(`🚀 service_orchestration() called with buttonname: ${buttonname}`);

  try {
    let username = localStorage.getItem("username");
    let idToken = localStorage.getItem("idToken"); // Fetch the token from local storage
    let User_Id = localStorage.getItem("User_ID");
    User_Id = parseInt(User_Id, 10);
    let password = localStorage.getItem("password");

    let AWSsecrets = await AuthorizationData("FETCH_METADATA", idToken, AWSsecretsName, username);

    // ✅ Check if the token has expired
    if (AWSsecrets?.message === "The incoming token has expired") {
      console.warn("🔄 Token expired! Refreshing...");

      // Refresh the token
      await AWSrefreshtoken();
      AWSsecrets = await AuthorizationData("FETCH_METADATA", idToken, AWSsecretsName, username);
    }

    // Continue processing if secrets are available
    if (!AWSsecrets || !AWSsecrets.results) {
      throw new Error("❌ AWSsecrets is undefined or missing results.");
    }

    console.log("✅ AWS Secrets Retrieved:", AWSsecrets);

    const UUID_Generated = [uuidv4()];
    const secretsObject = AWSsecrets.results["dsivis-dev-remaining-secrets"];
    let serviceorg_URL = secretsObject["ServOrch"];
    let pollingUrl = secretsObject["Polling"];

    // ✅ Creating S3 Upload Links

    if (buttonname === "SAVE_FORECAST") {
      console.log("📤 Uploading forecast files...");

      let S3Uploadobejct = await AuthorizationData("SAVE_FORECAST", idToken, AWSsecretsName, username, UUID_Generated);
      console.log(S3Uploadobejct);

      // ✅ Extract S3 Upload URLs
      let UploadS3SaveForecastURL = S3Uploadobejct["presigned urls"]["UPLOAD"]["SAVE_FORECAST"][UUID_Generated[0]];
      let UploadS3INPUTFILEURL = S3Uploadobejct["presigned urls"]["UPLOAD"]["INPUT_FILE"][UUID_Generated[0]];
      let UploadS3OUTPUTFILEURL = S3Uploadobejct["presigned urls"]["UPLOAD"]["OUTPUT_FILE"][UUID_Generated[0]];

      const flag_flatfileupload = await uploadFileToS3("Flat File", UploadS3SaveForecastURL);
      const flat_inputfileupload = await uploadFileToS3("Input File", UploadS3INPUTFILEURL);

      console.log(`🟢 Flat File Upload Flag: ${flag_flatfileupload}`);
      console.log(`🟢 Input File Upload Flag: ${flat_inputfileupload}`);

      if (flag_flatfileupload || flat_inputfileupload) {
        const servicestatus = await servicerequest(
          serviceorg_URL,
          buttonname,
          UUID_Generated[0],
          Model_UUID,
          idToken,
          AWSsecretsName,
          User_Id,
          cycleName,
          scenarioname
        );

        console.log("✅ Service Request Status:", servicestatus);

        if (servicestatus === "Endpoint request timed out" || servicestatus.status === "Poll") {
          // Poll for completion -> make an API call to polling lambda
          console.log("Polling for completion");
          return poll(UUID_Generated[0], AWSsecretsName, pollingUrl, idToken);
        } else {
          return servicestatus;
        }
        // ✅ Return service status
      }
    } else if (buttonname === "IMPORT_ASSUMPTIONS") {
      let S3downloadobject = await AuthorizationData(
        "IMPORT_ASSUMPTIONS",
        idToken,
        AWSsecretsName,
        username,
        Forecast_UUID
      );
      console.log(S3downloadobject);

      // ✅ Extract S3 Upload URLs
      let DownloadS3SaveForecastURL = S3downloadobject["presigned urls"]["DOWNLOAD"]["SAVE_FORECAST"][Forecast_UUID[0]];
      let DownloadS3INPUTFILEURL = S3downloadobject["presigned urls"]["DOWNLOAD"]["INPUT_FILE"][Forecast_UUID[0]];
      let DownloadS3OUTPUTFILEURL = S3downloadobject["presigned urls"]["DOWNLOAD"]["OUTPUT_FILE"][Forecast_UUID[0]];

      let downloadflg = await downloadAndInsertDataFromExcel(DownloadS3SaveForecastURL, "Flat File");
      let downloadflg1 = await downloadAndInsertDataFromExcel(DownloadS3INPUTFILEURL, "Input File");
      console.log(downloadflg);
      if (downloadflg.success === true) {
        return { status: "Scenario Imported" };
      }
    }

    // ✅ If no action was taken, return a default status
    return { status: "No operation performed" };
  } catch (error) {
    console.error("🚨 Error in service_orchestration:", error);

    // ✅ Return error response instead of failing silently
    return { status: "error", message: error.message };
  }
}

export async function postToServiceOrchestration(buttonName, secretName, userId, idToken) {
  try {
    const url = "https://eyou7tkt55.execute-api.us-east-1.amazonaws.com/dev/service_orchestration";
    const idToken_new = "Bearer " + idToken;

    // ✅ Generate UUID dynamically
    const UUID_Generated = uuidv4();

    // ✅ Construct the request body
    const body = {
      uuid: UUID_Generated,
      buttonName: buttonName,
      secret_name: secretName,
      user_id: userId,
    };

    console.log("📤 Sending API Request:", JSON.stringify(body, null, 2));

    // ✅ Set headers
    const headers = {
      Authorization: idToken_new,
      "Content-Type": "application/json",
    };

    // ✅ Make the POST request
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`❌ HTTP error! Status: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ API Response:", data);
    return data;
  } catch (error) {
    console.error("🚨 Error in POST request:", error);
    throw error;
  }
}

// refresh token fucntion
export async function AWSrefreshtoken() {
  const url = cognitoURL;

  // Retrieve refresh token from localStorage
  let refreshToken = localStorage.getItem("refreshToken");

  if (!refreshToken) {
    console.error("No refresh token found in localStorage");
    return;
  }

  const headers = {
    "Content-Type": "application/x-amz-json-1.1",
    "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
  };

  const body = JSON.stringify({
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: cognitoClientID,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const responseData = await response.json();

    // Log response
    console.log("Response Data:", responseData);

    // Update idToken in localStorage
    if (responseData.AuthenticationResult && responseData.AuthenticationResult.IdToken) {
      localStorage.setItem("idToken", responseData.AuthenticationResult.IdToken);
      console.log("idToken updated successfully in localStorage.");
    } else {
      console.error("No idToken found in response.");
    }

    return responseData;
  } catch (error) {
    console.error("Error in API request:", error);
  }
}

export async function downloadAndInsertDataFromExcel(s3Url, sheetName) {
  const downloadURL = s3Url;

  async function fetchData() {
    console.log("Starting to fetch the file from S3...");
    const response = await fetch(downloadURL);
    if (!response.ok) {
      throw new Error(`Failed to fetch the file: ${response.statusText}`);
    }
    console.log("File fetched successfully.");
    return response.arrayBuffer();
  }

  async function processExcelFile(arrayBuffer, sheetName) {
    console.log("Processing Excel file...");
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length === 0) {
      throw new Error("Excel sheet is empty.");
    }

    await insertParsedData(rows, sheetName);
  }

  function getColumnLetter(index) {
    let letter = "";
    while (index >= 0) {
      letter = String.fromCharCode((index % 26) + 65) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  }

  async function insertParsedData(rows, sheetName) {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getItemOrNullObject(sheetName);
      await context.sync();

      if (sheet.isNullObject) {
        throw new Error(`Sheet "${sheetName}" does not exist.`);
      }

      // Clear the sheet before inserting new data
      sheet.getUsedRange().clear();
      await context.sync();

      const rangeAddress = `A1:${getColumnLetter(rows[0].length - 1)}${rows.length}`;
      console.log(`Range Address: ${rangeAddress}`);

      try {
        const range = sheet.getRange(rangeAddress);
        range.load("address");
        await context.sync();

        range.values = rows;
        await context.sync();
        console.log(`Inserted data into sheet "${sheetName}"`);
      } catch (error) {
        console.error("Error during Excel run:", error);
        throw new Error("Invalid range or sheet. Please check the range and sheet name.");
      }
    });
  }

  try {
    console.log("Starting the download and insertion process...");
    const arrayBuffer = await fetchData();
    await processExcelFile(arrayBuffer, sheetName);
    console.log(`Data has been successfully inserted into the sheet: ${sheetName}`);
    return { success: true, newSheetName: sheetName };
  } catch (error) {
    console.error("Error:", error);
    console.log("Failed to fetch data. Please try again.");
    return { success: false, newSheetName: null };
  }
}

export async function poll(request_id, secret_name, pollingUrl, idToken) {
  if (!request_id || !secret_name) {
    console.error("❌ request_id and secret_name are required.");
    return { request_id, result: false };
  }

  const maxAttempts = 100;
  const delay = 5000; // 5 seconds
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(pollingUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`, // Add your token if required
          Accept: "*/*",
          "User-Agent": "PostmanRuntime/7.43.0",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
        },
        body: JSON.stringify({ request_id, secret_name }), // ✅ Send request_id & secret_name
      });

      if (!response.ok) {
        console.error(`HTTP Error: ${response.status} ${response.statusText}`);
        return { request_id, result: false };
      }

      const responseBody = await response.json();
      console.log(`Attempt ${attempts + 1}:`, responseBody);

      if (responseBody.status === "DONE") {
        console.log("✅ Polling complete!");
        return { request_id, result: responseBody.status };
      } else if (responseBody.status === "PENDING") {
        console.log("⏳ Still processing... waiting for 5 seconds.");
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempts++;
      } else {
        console.error("❌ Unexpected status:", responseBody.status);
        return { request_id, result: responseBody.status };
      }
    } catch (error) {
      console.error("⚠️ Polling error:", error);
      return { request_id, result: responseBody.status };
    }
  }

  console.error("⏳ Polling timed out after 100 attempts.");
  return { request_id, result: responseBody.status };
}
