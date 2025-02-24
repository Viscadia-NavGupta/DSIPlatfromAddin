import { v4 as uuidv4 } from "uuid"; // ✅ Import UUID Generator
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

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
  const idToken_new = "Bearer " + idToken;
  const headers = {
    Authorization: idToken_new, // Add the ID token from Cognito
    "Content-Type": "application/json", // Ensure content type is JSON
  };
  const body = {
    action: buttonname,
    secret_name: secretName,
    email_id: emailId,
    UUID: UUID,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Fetch Metadata Response:", data);
    return data; // Return the response data
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
export async function uploadFileToS3(sheetName, uploadURL) {
  try {
    return await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getItem(sheetName);
      let range = sheet.getUsedRange();
      range.load(["values", "numberFormat"]);
      await context.sync();

      // Validate if the sheet has data
      if (!range.values || range.values.length === 0) {
        console.error("🚨 No data found in the worksheet.");
        return false;
      }

      // Create a new Excel workbook and add a worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(sheetName);

      // Append data to the worksheet
      range.values.forEach((row) => {
        worksheet.addRow(row);
      });

      // Convert workbook to a buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Convert buffer to a Blob
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      console.log(`📤 Uploading file to: ${uploadURL}`); // Debugging log

      // Upload the file to S3
      const startTime = performance.now();

      const response = await fetch(uploadURL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "x-amz-acl": "bucket-owner-full-control", // Ensure correct ownership
        },
        body: blob,
      });

      const endTime = performance.now();
      const uploadTime = (endTime - startTime) / 1000; // Convert to seconds

      if (response.ok) {
        console.log(`✅ File uploaded successfully. Time taken: ${uploadTime} seconds.`);
        return true; // Success
      } else {
        const errorMsg = await response.text();
        console.error(`❌ Error uploading file. Status code: ${response.status}`, errorMsg);
        return false; // Failure
      }
    });
  } catch (error) {
    console.error("🚨 Error uploading file:", error);
    return false; // Failure
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
      scenario_name: scenarioName, // ✅ Fixed scenarioName (was wrongly assigned cycleName)
    };

    console.log("📤 Sending API Request:", JSON.stringify(body, null, 2));

    // ✅ Make API request
    const response = await fetch(serviceURL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`❌ HTTP error! Status: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ Fetch Metadata Response:", data);

    // ✅ Return only the message field from the response
    return data.message || "No message in response";
  } catch (error) {
    console.error("🚨 Error fetching metadata:", error);
    return `Error: ${error.message}`; // ✅ Return error message instead of throwing
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

        // ✅ Return service status
        return servicestatus;
      }
    } else if (buttonname === "IMPORT_ASSUMPTIONS"){

      let S3downloadobject = await AuthorizationData("IMPORT_ASSUMPTIONS", idToken, AWSsecretsName, username, Forecast_UUID);
      console.log(S3downloadobject);
  
      // ✅ Extract S3 Upload URLs
      let DownloadS3SaveForecastURL = S3downloadobject["presigned urls"]["DOWNLOAD"]["SAVE_FORECAST"][Forecast_UUID[0]];
      let DownloadS3INPUTFILEURL = S3downloadobject["presigned urls"]["DOWNLOAD"]["INPUT_FILE"][Forecast_UUID[0]];
      let DownloadS3OUTPUTFILEURL = S3downloadobject["presigned urls"]["DOWNLOAD"]["OUTPUT_FILE"][Forecast_UUID[0]];

      let downloadflg = await downloadAndInsertDataFromExcel(DownloadS3SaveForecastURL,"Flat File");
      console.log(downloadflg);


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

function trimLink(url) {
  return url.replace(/\/[^/]+$/, "/");
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
    ClientId: AWSsecretsName,
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
  const BATCH_SIZE = 90000; // Adjust batch size

  try {
      console.log("📥 Initiating GET request:", downloadURL);

      // Fetch file from S3
      const response = await fetch(downloadURL);
      if (!response.ok) {
          throw new Error(`❌ Failed to fetch file: ${response.statusText}`);
      }

      console.log("✅ File fetched successfully. Processing data...");
      const blob = await response.blob();

      // Process Excel file and insert into sheet
      const rowCount = await processExcelFile(blob, sheetName, BATCH_SIZE);
      console.log(`✅ Successfully inserted ${rowCount} rows into '${sheetName}'`);
      return { success: true, rowCount };
  } catch (error) {
      console.error("❌ Error:", error);
      return { success: false, error: error.message };
  }git add .
}


// ✅ Function to Process Excel File and Write Data at Original Positions
async function processExcelFile(blob, sheetName, batchSize) {
  console.log("🚀 Starting processExcelFile function...");

  let reader = new FileReader();

  return new Promise((resolve, reject) => {
      reader.readAsArrayBuffer(blob);

      reader.onload = async function (event) {
          console.log("📥 File successfully loaded into memory.");

          let arrayBuffer = event.target.result;
          let workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(arrayBuffer);
          console.log("📚 ExcelJS Workbook loaded successfully.");

          let worksheet = workbook.worksheets[0];
          console.log("📑 Extracted Sheet Name:", worksheet.name);

          // ✅ Extract Excel Data with Original Cell Locations
          let excelData = [];
          worksheet.eachRow({ includeEmpty: true }, (row, rowIndex) => {
              let rowData = [];
              row.eachCell({ includeEmpty: true }, (cell, colIndex) => {
                  rowData[colIndex - 1] = cell.value ?? ""; // Store value
              });
              excelData[rowIndex - 1] = rowData; // Maintain original row index
          });

          console.log(`📊 Extracted ${excelData.length} rows from file`);

          if (excelData.length === 0) {
              console.warn("⚠️ No data found in the Excel file.");
              reject("No valid data found");
              return;
          }

          console.log("🔹 Preparing to insert data into Excel...");

          await Excel.run(async (context) => {
              console.log("📌 Fetching worksheet list...");
              let sheets = context.workbook.worksheets;
              sheets.load("items/name");
              await context.sync();

              let availableSheets = sheets.items.map(sheet => sheet.name);
              console.log("📃 Available Sheets:", availableSheets);

              if (!availableSheets.includes(sheetName)) {
                  console.error(`❌ Sheet "${sheetName}" not found.`);
                  reject(`Sheet "${sheetName}" does not exist.`);
                  return;
              }

              console.log(`✅ Sheet "${sheetName}" found. Activating...`);
              let sheet = context.workbook.worksheets.getItem(sheetName);
              sheet.activate();
              await context.sync();

              // ✅ Set Calculation Mode to Manual for Performance
              context.workbook.application.calculationMode = "Manual";
              context.workbook.application.suspendCalculationUntilNextSync();

              // ✅ Batch Insert Data to Maintain Original Positions
              let totalBatches = Math.ceil(excelData.length / batchSize);
              console.log(`📌 Total batches to process: ${totalBatches}`);

              let startRow = 1;
              for (let i = 0; i < excelData.length; i += batchSize) {
                  let batch = excelData.slice(i, i + batchSize);
                  let endRow = Math.min(i + batchSize, excelData.length);

                  console.log(`🔹 Processing batch ${i + 1} to ${endRow}`);
                  console.log("📌 First 5 rows of batch:", batch.slice(0, 5));

                  try {
                      await insertParsedData(batch, startRow, sheet);
                      startRow += batch.length;
                  } catch (error) {
                      console.error("❌ Failed to insert batch:", error);
                      reject(error);
                      return;
                  }
              }

              // ✅ Restore Calculation Mode
              context.workbook.application.calculationMode = "Automatic";
              await context.sync();
          });

          console.log("✅ Excel pasting operation completed!");
          resolve(excelData.length);
      };

      reader.onerror = () => {
          console.error("❌ Failed to read Excel file");
          reject("Failed to read Excel file");
      };
  });
}

// ✅ Function to Insert Data at Exact Same Cells
async function insertParsedData(rows, startRow, sheet) {
  await Excel.run(async (context) => {
      console.log(`📌 Inserting ${rows.length} rows starting at row ${startRow} in sheet "${sheet.name}"`);

      const endRow = startRow + rows.length - 1;
      const columnCount = rows[0].length;
      const rangeAddress = `A${startRow}:${getColumnLetter(columnCount - 1)}${endRow}`;

      console.log(`📍 Target Range: ${rangeAddress}`);
      console.log("📌 First 5 rows being inserted:", rows.slice(0, 5));

      try {
          const range = sheet.getRange(rangeAddress);
          range.load("address");
          await context.sync();

          range.values = rows;
          await context.sync();
          console.log(`✅ Successfully inserted rows ${startRow} to ${endRow}`);
      } catch (error) {
          console.error("❌ Error during Excel insertion:", error);
          throw new Error("Invalid range or sheet. Please check the range and sheet name.");
      }
  });
}

// ✅ Helper Function to Convert Column Index to Letter
function getColumnLetter(colIndex) {
  let letter = "";
  while (colIndex >= 0) {
      letter = String.fromCharCode((colIndex % 26) + 65) + letter;
      colIndex = Math.floor(colIndex / 26) - 1;
  }
  return letter;
}
