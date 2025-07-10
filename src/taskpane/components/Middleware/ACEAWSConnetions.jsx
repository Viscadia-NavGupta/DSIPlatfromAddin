/// authentication funcitons
import * as XLSX from "xlsx";
import Papa from "papaparse";
import * as excelfunctions from "../ExcelMidleware/excelFucntions";
import React from "react";
import ReactDOM from "react-dom";
import { DialogProvider, useDialog } from "../dialogcontext";
import Overirdeconfirmation from "../OverideConfirmationpage";

function logCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  console.log(`Current Time: ${hours}:${minutes}:${seconds}`);
}

export async function orchestrationfucntion(
  buttonname,
  override_flag = "",
  UUID = "",
  forecast_uuid = "",
  scenarioname = "",
  cycleName = "",
  model_uuid = ""
) {
  try {
    const verified = await verifyRoleAndFetchSecrets(sessionStorage.getItem("username"), buttonname);
    console.log(verified);
    console.log("Secret Name:", verified.secret_name);
    console.log("Upload S3 URL:", verified.urls.UploadS3);
    console.log("Download S3 URL:", verified.urls.DownloadS3);
    console.log("Service Orchestration Lambda URL:", verified.urls.ServiceOrchestrationLambda);
    console.log("PollingLambda URL:", verified.urls.PollingLambda);
    var UUIDGenrated;
    if (UUID === "") {
      UUIDGenrated = await generateUUID();
      console.log(UUIDGenrated);
      if (buttonname === "GENERATE ACE SHEET" || buttonname === "RUN COMPUTATION") {
        var isUploaded = await uploadFileToS3(UUIDGenrated, verified.urls.UploadS3, buttonname);
        console.log("File uploaded to S3 successfully.");
      } else if (buttonname === "SAVE FORECAST" || buttonname === "UNLOCK FORECAST" || buttonname === "LOCK FORECAST") {
        isUploaded = true;
      }
    } else if (UUID != "") {
      UUIDGenrated = UUID;
      isUploaded = true;
    }

    if (isUploaded) {
      var serviceranflag = await runService(
        UUIDGenrated,
        buttonname,
        verified.secret_name,
        verified.urls.ServiceOrchestrationLambda,
        verified.urls.PollingLambda,
        override_flag,
        cycleName,
        scenarioname,
        forecast_uuid,
        model_uuid
      );
      // Additional logic if needed
    } else {
      console.log("Failed to upload the file to S3.");
      // Additional logic if needed
    }
    if (serviceranflag.result === true) {
      if (buttonname === "GENERATE ACE SHEET") {
        UUIDGenrated = UUIDGenrated + ".csv";
        verified.urls.DownloadS3 = verified.urls.DownloadS3 + "GENERATE ACE SHEET/";
        //s3://download-docket/GENERATE ACE SHEET/
      } else if (buttonname === "RUN COMPUTATION") {
        verified.urls.DownloadS3 = verified.urls.DownloadS3 + "RUN COMPUTATION/horizontal_data_dump/";
        //"RUN COMPUTATION/horizontal_data_dump/"
        //s3://download-docket/RUN COMPUTATION/Power_BI_data_dump/
      } else if (buttonname === "SAVE FORECAST" || buttonname === "UNLOCK FORECAST" || buttonname === "LOCK FORECAST") {
        return serviceranflag;
      }
      if (buttonname === "GENERATE ACE SHEET" || buttonname === "RUN COMPUTATION") {
        var outputflag = await downloadAndInsertDataFromExcel(UUIDGenrated, verified.urls.DownloadS3, buttonname);
      }
      console.log("Outputflag:", outputflag);
      if (outputflag.success && buttonname === "GENERATE ACE SHEET") {
        logCurrentTime();
        await excelfunctions.aceSheetformat(outputflag.newSheetName);
        logCurrentTime();
        return { uuid: UUIDGenrated, result: true };
      }
    } else if (serviceranflag.result === "Override") {
      return serviceranflag;
    }
  } catch (error) {
    console.error("Error in orchestrationfucntion:", error);
  }
}

export async function getCognitoAccessToken(username, password) {
  const clientId = "4nur5l5aqs5hp1tvurcc6gt5oj"; // Replace with your Cognito App Client ID
  const url = "https://cognito-idp.ap-south-1.amazonaws.com/";

  const body = JSON.stringify({
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: clientId,
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
        "X-Amz-User-Agent": "aws-amplify/0.1.x js",
      },
      body: body,
    });

    if (response.ok) {
      const responseBody = await response.json();
      if (responseBody.AuthenticationResult && responseBody.AuthenticationResult.IdToken) {
        const token = responseBody.AuthenticationResult.IdToken;
        console.log("Token received: ", token);
        return { success: true, token: token };
      } else {
        return { success: false, message: "Failed to retrieve token." };
      }
    } else {
      const errorBody = await response.json();
      const errorMessage = errorBody.message || "HTTP error! status: " + response.status;
      return { success: false, message: errorMessage };
    }
  } catch (error) {
    console.error("Error fetching Cognito access token:", error);
    return { success: false, message: error.message };
  }
}
///////////////// very roles and Secrects data

export async function verifyRoleAndFetchSecrets(email, buttonName) {
  try {
    // Validate email
    if (!email || email.indexOf("@") === -1) {
      throw new Error("Please enter a valid email address.");
    }

    const url = "https://k06jq91m02.execute-api.ap-south-1.amazonaws.com/ViscadiaTest/SQLdbQueryTest/user-login";
    const jsonPayload = JSON.stringify({
      email_id: email,
      action: buttonName,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: jsonPayload,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseBody = await response.json();
    console.log("Response Body:", responseBody); // Debugging line, remove if not needed

    // Extract the first result key and parse the JSON string
    const firstResultKey = Object.keys(responseBody.results)[0];
    const resultData = JSON.parse(responseBody.results[firstResultKey]);

    // Prepare the return data object
    const returnData = {
      secret_name: responseBody.secret_name,
      urls: {
        UploadS3: resultData.UploadS3,
        DownloadS3: resultData.DownloadS3,
        ServiceOrchestrationLambda: resultData.ServiceOrchestrationLambda,
        PollingLambda: resultData.PollingLambda,
      },
    };

    console.log("Return Data:", returnData); // Debugging line, remove if not needed

    return returnData;
  } catch (error) {
    console.error("Error in verifyRoleAndFetchSecrets:", error);
    throw error;
  }
}

/// UUID genrator

async function generateUUID() {
  // Generate a random UUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    console.log(v.toString(16));
    return v.toString(16);
  });
}

export async function uploadFileToS3(uuid, uploadURL, buttonName) {
  try {
    return await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      let range = sheet.getUsedRange();
      range.load(["values", "numberFormat"]);
      await context.sync();

      // Remove the first column (Column A) if buttonName is "RUN COMPUTATION"
      let worksheetData = range.values;
      let numberFormats = range.numberFormat;

      if (buttonName === "RUN COMPUTATION") {
        worksheetData = worksheetData.map((row) => row.slice(1)); // Remove the first column (Column A) from each row
        numberFormats = numberFormats.map((format) => format.slice(1)); // Remove the first column's format
      }

      // Create worksheet and apply values
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Apply number formats
      for (let R = 0; R < worksheetData.length; R++) {
        for (let C = 0; C < worksheetData[R].length; C++) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (worksheet[cellRef]) {
            worksheet[cellRef].z = numberFormats[R][C];
          }
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        buttonName === "GENERATE ACE SHEET" ? "Model Management" : "ACE"
      );

      // Generate the binary output for the workbook
      const workbookBinary = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([workbookBinary], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Ensure that the uploadURL ends with a slash
      if (!uploadURL.endsWith("/")) {
        uploadURL += "/";
      }

      // Set the URL for the S3 bucket's endpoint with the filename as the UUID
      const strURL = `${uploadURL}${uuid}.xlsx`;

      const startTime = performance.now();

      const response = await fetch(strURL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
        body: blob,
      });

      const endTime = performance.now();
      const uploadTime = (endTime - startTime) / 1000; // Convert to seconds

      if (response.ok) {
        console.log(`File uploaded successfully. Time taken: ${uploadTime} seconds.`);
        return true; // Indicating success
      } else {
        console.error(`Error uploading file. Status code: ${response.status}`, await response.text());
        return false; // Indicating failure
      }
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return false; // Indicating failure
  }
}

//// polling

export async function poll(uuid, secret_name, pollingUrl) {
  // Validate input parameters
  if (!uuid || !secret_name || !pollingUrl) {
    console.log("All parameters must be provided.");
    return { uuid: uuid, result: false };
  }

  // Initialize attempts counter
  let attempts = 0;
  const maxAttempts = 100;
  const delay = 5000; // 5 seconds delay

  // Construct the JSON payload
  const jsonPayload = JSON.stringify({ uuid, secret_name });

  // Polling loop
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(pollingUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: jsonPayload,
      });

      const responseBodyText = await response.text();

      // Parse the first level of response
      let responseBody;
      try {
        responseBody = JSON.parse(responseBodyText);
      } catch (error) {
        console.error("Response is not valid JSON:", responseBodyText);
        return { uuid: uuid, result: false };
      }

      console.log("Parsed response:", responseBody);

      // Check the response status directly
      switch (responseBody.status) {
        case "DONE":
          return { uuid: uuid, result: true };
        case "PENDING":
          // Wait for a specified time (e.g., 5 seconds) before polling again
          await new Promise((resolve) => setTimeout(resolve, delay));
          attempts++;
          break;
        default:
          console.error("Service call failed:", responseBody.message, ". Please rerun the service.");
          return false;
      }
    } catch (error) {
      console.error("Error during polling:", error);
      return { uuid: uuid, result: false };
    }
  }

  console.error("Polling exceeded maximum attempts");
  return { uuid: uuid, result: false };
}

/// end of polling
export async function runService(
  uuid,
  buttonName,
  secret_name,
  serviceUrl,
  pollingUrl,
  override_flag = "",
  cycleName = "",
  scenarioname = "",
  forecastuuid = "",
  model_uuid = ""
) {
  // Validate input parameters
  if (!uuid || !buttonName || !secret_name || !serviceUrl) {
    console.error("All parameters must be provided.");
    return false;
  }

  // Construct the JSON payload based on the button name using switch case logic
  let jsonPayload;
  switch (buttonName) {
    case "GENERATE ACE SHEET":
    case "RUN COMPUTATION":
      jsonPayload = {
        uuid: uuid,
        buttonName: buttonName,
        secret_name: secret_name,
        override_flag: override_flag,
      };
      break;
    case "LOCK FORECAST":
    case "UNLOCK FORECAST":
    case "SAVE FORECAST":
      jsonPayload = {
        uuid: uuid,
        model_uuid: model_uuid,
        forecast_uuid: forecastuuid,
        buttonName: buttonName,
        secret_name: secret_name,
        cycle_name: cycleName,
        scenario_name: scenarioname,
      };
      break;
    default:
      jsonPayload = {
        uuid: uuid,
        buttonName: buttonName,
        secret_name: secret_name,
      };
      break;
  }

  try {
    // Make the HTTP request
    const response = await fetch(serviceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(jsonPayload),
    });

    const responseBody = await response.json();
    console.log(responseBody);

    // Check the response status
    if (responseBody.status === "Success" || responseBody.statusCode) {
      return { uuid: uuid, result: true };
    } else if (responseBody.message === "Endpoint request timed out" || responseBody.status === "Poll") {
      // Poll for completion -> make an API call to polling lambda
      console.log("Polling for completion");
      return await poll(uuid, secret_name, pollingUrl);
    } else if (responseBody.status === "Override" && buttonName === "GENERATE ACE SHEET") {
      return { uuid: uuid, result: "Override" };
    } else {
      // alert("Model Generation cancelled by user.");
      return false;
    }
  } catch (error) {
    console.error("Error in service call:", error);
    return { uuid: uuid, result: false };
  }
}

export async function downloadAndInsertDataFromExcelxlsx(fileName, s3Url, serviceName) {
  const downloadURL = s3Url + fileName;
  const BATCH_SIZE = 10000; // Reduced batch size for better performance
  const NORMALIZE_BATCH_SIZE = 10000; // Number of rows to normalize at once
  const TEMP_SHEET_NAME = "tempAWSdata";

  // Fetch the data from S3
  async function fetchData() {
    console.log("Starting to fetch the file from S3...");
    const response = await fetch(downloadURL);
    if (!response.ok) {
      throw new Error(`Failed to fetch the file: ${response.statusText}`);
    }
    console.log("File fetched successfully. Processing data...");
    return response.arrayBuffer();
  }

  // Process the file based on the type (CSV or XLSX)
  async function processFile(arrayBuffer) {
    if (serviceName === "RUN COMPUTATION" || serviceName === "Import GENERATE ACE SHEET") {
      if (serviceName === "RUN COMPUTATION") {
        console.log("Processing CSV file...");
        await processCSV(new TextDecoder("utf-8").decode(arrayBuffer));
      } else if (serviceName === "Import GENERATE ACE SHEET") {
        console.log("Processing XLSX file...");
        await processXLSX(arrayBuffer);
      }
    } else {
      throw new Error("Unsupported service name for file processing.");
    }
  }

  // Process the CSV content
  async function processCSV(csvContent) {
    const rows = Papa.parse(csvContent, {
      header: false,
      dynamicTyping: true,
      skipEmptyLines: true,
      quoteChar: '"',
      escapeChar: '"',
      error: function (error) {
        console.error(`Error parsing CSV: ${error.message}`);
      },
    }).data;

    await normalizeRows(rows);
    await insertParsedData(rows, 1);
  }

  // Process the XLSX content
  async function processXLSX(arrayBuffer) {
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });

    await normalizeRows(rows);
    await insertParsedData(rows, 1);
  }

  // Normalize the rows to ensure they all have the same number of columns
  async function normalizeRows(rows) {
    const maxCols = Math.max(...rows.map((row) => row.length));
    console.log(`Normalizing rows to ${maxCols} columns.`);
    let index = 0;

    function normalizeBatch() {
      const endIndex = Math.min(index + NORMALIZE_BATCH_SIZE, rows.length);
      for (let i = index; i < endIndex; i++) {
        while (rows[i].length < maxCols) {
          rows[i].push("");
        }
      }
      index = endIndex;
    }

    while (index < rows.length) {
      normalizeBatch();
      await new Promise(requestAnimationFrame); // Allows browser to render in between batches
    }
  }

  // Get Excel column letter from index
  function getColumnLetter(index) {
    let letter = "";
    while (index >= 0) {
      letter = String.fromCharCode((index % 26) + 65) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  }

  // Insert parsed data into the temp sheet
  async function insertParsedData(rows, startRow) {
    await Excel.run(async (context) => {
      context.application.suspendApiCalculationUntilNextSync(); // Suspend recalculations
      context.application.suspendScreenUpdatingUntilNextSync(); // Suspend screen updates

      const sheet = context.workbook.worksheets.getItem(TEMP_SHEET_NAME);
      const columnCount = rows[0].length;

      let batchStart = 0;
      while (batchStart < rows.length) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, rows.length);
        const batchRows = rows.slice(batchStart, batchEnd);
        const endRow = startRow + batchRows.length - 1;
        const rangeAddress = `A${startRow}:${getColumnLetter(columnCount - 1)}${endRow}`;

        console.log(`Inserting range: ${rangeAddress}`);
        const range = sheet.getRange(rangeAddress);
        range.values = batchRows;
        await context.sync(); // Sync after each batch to reduce overhead

        batchStart = batchEnd;
        startRow += BATCH_SIZE;
      }
    }).catch((error) => {
      console.error("Error during Excel run:", error);
    });
  }

  // Create a temp sheet
  async function createTempSheet(sheetName) {
    await Excel.run(async (context) => {
      try {
        const tempSheet = context.workbook.worksheets.getItem(sheetName);
        tempSheet.delete();
        await context.sync();
      } catch (error) {
        console.log(`${sheetName} sheet does not exist. Proceeding to create it.`);
      }

      context.workbook.worksheets.add(sheetName);
      await context.sync();
    }).catch((error) => {
      console.error("Error creating temp sheet:", error);
    });
  }

  // Rename the sheet based on the service name
  async function renameSheet(serviceName) {
    return Excel.run(async (context) => {
      const tempSheet = context.workbook.worksheets.getItem(TEMP_SHEET_NAME);
      let newSheetName;

      if (serviceName === "GENERATE ACE SHEET" || serviceName === "Import GENERATE ACE SHEET") {
        const cellI5 = tempSheet.getRange("I5");
        cellI5.load("values");
        await context.sync();

        newSheetName = cellI5.values[0][0];
        if (newSheetName === "") {
          console.error("Cell I5 is empty");
          return { success: false, newSheetName: null };
        }

        // Truncate to 31 characters and remove invalid characters
        newSheetName = newSheetName.substring(0, 31).replace(/[:\/\\\?\*\[\]]/g, "");
        newSheetName = newSheetName.trim(); // Remove leading/trailing spaces
      } else if (serviceName === "RUN COMPUTATION") {
        newSheetName = "outputs";
      } else {
        console.error("Unknown service name.");
        return { success: false, newSheetName: null };
      }

      // Check if a sheet with the new name already exists
      let sheetExists = false;
      try {
        const existingSheet = context.workbook.worksheets.getItem(newSheetName);
        existingSheet.load("name");
        await context.sync();
        sheetExists = true;
      } catch (error) {
        sheetExists = false;
      }

      if (sheetExists) {
        const sheetToDelete = context.workbook.worksheets.getItem(newSheetName);
        sheetToDelete.delete();
        await context.sync();
      }

      tempSheet.name = newSheetName;
      await context.sync();

      console.log(`Sheet renamed to ${newSheetName}`);
      return { success: true, newSheetName: newSheetName };
    }).catch((error) => {
      console.error("Error renaming sheet:", error);
      return { success: false, newSheetName: null };
    });
  }

  // Main function logic
  try {
    console.log("Starting the download and insertion process...");
    const arrayBuffer = await fetchData();

    // Create the temp sheet
    await createTempSheet(TEMP_SHEET_NAME);

    // Process the file based on its type
    await processFile(arrayBuffer);
    console.log("Data has been successfully inserted into the temp sheet.");

    // Rename the temp sheet based on the service name
    const result = await renameSheet(serviceName);
    return result;
  } catch (error) {
    console.error("Error during download and insertion:", error);
    return { success: false, newSheetName: null };
  }
}

export async function uploadFileToS3test(uuid, uploadURL, buttonName) {
  try {
    return await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      const range = sheet.getUsedRange();

      // Load additional properties
      range.load(["values", "numberFormat", "format/fill", "format/font", "format/borders"]);
      await context.sync();

      // Convert the sheet data to a workbook binary using XLSX
      const worksheetData = range.values;
      const numberFormats = range.numberFormat;
      const fills = range.format.fill;
      const fonts = range.format.font;
      const borders = range.format.borders;

      // Check and log worksheet data
      console.log("Worksheet Data:", worksheetData);

      // Handle empty cells by replacing undefined values with an empty string
      for (let R = 0; R < worksheetData.length; R++) {
        for (let C = 0; C < worksheetData[R].length; C++) {
          if (worksheetData[R][C] === undefined) {
            worksheetData[R][C] = "";
          }
        }
      }

      // Create worksheet and apply values
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Apply number formats, fills, fonts, and borders
      for (let R = 0; R < worksheetData.length; R++) {
        for (let C = 0; C < worksheetData[R].length; C++) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (worksheet[cellRef]) {
            worksheet[cellRef].z = numberFormats[R][C]; // Number format

            // Ensure fills, fonts, and borders exist before applying
            worksheet[cellRef].s = {
              fill: fills[R] && fills[R][C] ? mapFills(fills[R][C]) : undefined,
              font: fonts[R] && fonts[R][C] ? mapFonts(fonts[R][C]) : undefined,
              border: borders[R] && borders[R][C] ? mapBorders(borders[R][C]) : undefined,
            };
          }
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        buttonName === "GENERATE ACE SHEET" ? "Model Management" : "ACE"
      );

      // Generate the binary output for the workbook
      const workbookBinary = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([workbookBinary], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Ensure that the uploadURL ends with a slash
      if (!uploadURL.endsWith("/")) {
        uploadURL += "/";
      }

      const strURL = `${uploadURL}${uuid}.xlsx`;

      const startTime = performance.now();
      const response = await fetch(strURL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
        body: blob,
      });
      const endTime = performance.now();
      const uploadTime = (endTime - startTime) / 1000; // Convert to seconds

      if (response.ok) {
        console.log(`File uploaded successfully. Time taken: ${uploadTime} seconds.`);
        return true; // Indicating success
      } else {
        console.error(`Error uploading file. Status code: ${response.status}`, await response.text());
        return false; // Indicating failure
      }
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return false; // Indicating failure
  }
}

// Helper Functions

function mapBorders(borders) {
  const borderStyles = {};

  if (borders) {
    const sides = ["top", "bottom", "left", "right"];
    sides.forEach((side) => {
      if (borders[side]) {
        borderStyles[side] = {
          style: borders[side].style,
          color: { rgb: borders[side].color },
        };
      }
    });
  }

  return borderStyles;
}

function mapFonts(font) {
  return {
    name: font.name,
    color: { rgb: font.color },
    bold: font.bold,
    italic: font.italic,
    underline: font.underline ? true : undefined,
    size: font.size,
  };
}

export async function modifySheet(sheetName) {
  try {
    return await Excel.run(async (context) => {
      // Attempt to get the specified worksheet by name
      let sheet = context.workbook.worksheets.getItemOrNullObject(sheetName);
      sheet.load("name"); // Load the 'name' property to ensure it is available
      await context.sync();

      // Check if the sheet exists
      if (sheet.isNullObject) {
        console.error(`Sheet "${sheetName}" does not exist.`);
        return null; // Return null if the sheet does not exist
      }

      console.log(`Sheet "${sheet.name}" exists and is ready to be modified.`);

      // Ensure the sheet has some content to work with
      const usedRange = sheet.getUsedRangeOrNullObject();
      usedRange.load("address");
      await context.sync();

      if (usedRange.isNullObject) {
        console.error(`Sheet "${sheet.name}" has no used range, cannot proceed with modifications.`);
        return sheet.name; // Return the current sheet name if there's no used range
      }

      console.log(`Sheet "${sheet.name}" used range: ${usedRange.address}`);

      // Insert a new column at the first position (before column "A")
      try {
        const firstColumn = sheet.getRange("A:A");
        console.log(`Attempting to insert a column before A in sheet "${sheetName}".`);
        firstColumn.insert(Excel.InsertShiftDirection.right);
        await context.sync();
        console.log(`New column inserted before column A in sheet "${sheetName}".`);
      } catch (error) {
        console.error(`Error inserting column in sheet "${sheetName}":`, error);
        return sheet.name; // Return the current sheet name if there's an issue inserting the column
      }

      // Delete the first two rows
      try {
        const firstTwoRows = sheet.getRange("1:2");
        console.log(`Attempting to delete the first two rows in sheet "${sheetName}".`);
        firstTwoRows.delete(Excel.DeleteShiftDirection.up);
        await context.sync();
        console.log(`First two rows deleted in sheet "${sheetName}".`);
      } catch (error) {
        console.error(`Error deleting rows in sheet "${sheetName}":`, error);
        return sheet.name; // Return the current sheet name if there's an issue deleting the rows
      }

      // Rename the sheet based on the value in cell J5
      try {
        const cellJ5 = sheet.getRange("J5");
        cellJ5.load("values");
        await context.sync();

        if (Array.isArray(cellJ5.values) && cellJ5.values.length > 0 && cellJ5.values[0].length > 0) {
          const newSheetName = cellJ5.values[0][0];

          if (newSheetName) {
            // Clean up the new sheet name: truncate to 31 chars and remove invalid characters
            let cleanSheetName = newSheetName
              .substring(0, 31)
              .replace(/[:\/\\\?\*\[\]]/g, "")
              .replace(/\s+/g, " ") // Replace multiple spaces with a single space
              .trim();

            console.log(`New sheet name after cleanup: "${cleanSheetName}"`);

            // Check if the cleaned sheet name is not empty
            if (cleanSheetName) {
              // Check if a sheet with this name already exists
              const existingSheet = context.workbook.worksheets.getItemOrNullObject(cleanSheetName);
              await context.sync();

              if (!existingSheet.isNullObject) {
                console.log(`A sheet with the name "${cleanSheetName}" already exists. Deleting it.`);
                existingSheet.delete();
                await context.sync();
                console.log(`Sheet "${cleanSheetName}" deleted.`);
              }

              // Rename the current sheet
              sheet.name = cleanSheetName;
              await context.sync();
              console.log(`Sheet renamed to "${cleanSheetName}".`);
              return cleanSheetName; // Return the new sheet name
            } else {
              console.error("The value in J5 is either empty or invalid after cleanup.");
              return sheet.name; // Return the current sheet name if J5 is invalid
            }
          } else {
            console.error("Cell J5 is empty, cannot rename the sheet.");
            return sheet.name; // Return the current sheet name if J5 is empty
          }
        } else {
          console.error("Invalid value or structure in cell J5");
          return sheet.name; // Return the current sheet name if J5 is invalid
        }
      } catch (error) {
        console.error(`Error renaming sheet based on the value in cell J5:`, error);
        return sheet.name; // Return the current sheet name if there's an issue renaming the sheet
      }
    });
  } catch (error) {
    console.error(`Error modifying the sheet "${sheetName}":`, error);
    return null; // Return null if there was an error with the modification
  }
}

export async function downloadAndInsertDataFromExcel(fileName, s3Url, serviceName) {
  const filenamedownload = fileName;
  const downloadURL = s3Url + filenamedownload;
  const BATCH_SIZE = 90000;
  const NORMALIZE_BATCH_SIZE = 20000;
  const TEMP_SHEET_NAME = "tempAWSdata";
  const OUTPUTS_SHEET_NAME = "outputs";

  async function fetchData() {
    console.log("Starting to fetch the file from S3...");
    const response = await fetch(downloadURL);
    if (!response.ok) {
      throw new Error(`Failed to fetch the file: ${response.statusText}`);
    }
    console.log("File fetched successfully. Streaming data in chunks...");
    return response.body;
  }

  async function processStream(stream, sheetName) {
    console.log("Starting to process stream...");
    const reader = stream.getReader();
    let rows = [];
    let rowIndex = 1;
    let buffer = "";

    return new Promise((resolve, reject) => {
      const processChunk = async ({ done, value }) => {
        if (done) {
          if (buffer) {
            processBuffer(buffer);
          }
          if (rows.length > 0) {
            await normalizeRows(rows);
            await insertParsedData(rows, rowIndex, sheetName);
            rowIndex += rows.length;
          }
          console.log("Stream processing completed.");
          resolve();
          return;
        }

        const text = new TextDecoder("utf-8").decode(value);
        const lines = (buffer + text).split("\n");
        buffer = lines.pop();

        for (let line of lines) {
          processBuffer(line);
        }

        if (rows.length >= BATCH_SIZE) {
          await normalizeRows(rows);
          await insertParsedData(rows.slice(0, BATCH_SIZE), rowIndex, sheetName);
          rowIndex += BATCH_SIZE;
          rows = rows.slice(BATCH_SIZE);
        }

        reader.read().then(processChunk).catch(reject);
      };

      reader.read().then(processChunk).catch(reject);
    });

    function processBuffer(line) {
      const parsedLine = Papa.parse(line, {
        header: false,
        dynamicTyping: true,
        skipEmptyLines: true,
        quoteChar: '"',
        escapeChar: '"',
        error: function (error) {
          console.error(`Error parsing line: ${error.message}`);
        },
      });

      if (parsedLine.errors.length > 0) {
        parsedLine.errors.forEach((err) => console.error(`CSV Parsing Error: ${err.message}`));
      } else {
        rows.push(parsedLine.data[0]);
      }
    }
  }

  async function normalizeRows(rows) {
    return new Promise((resolve) => {
      const maxCols = Math.max(...rows.map((row) => row.length));
      console.log(`Normalizing rows to ${maxCols} columns.`);
      let index = 0;

      function normalizeBatch() {
        const endIndex = Math.min(index + NORMALIZE_BATCH_SIZE, rows.length);
        for (let i = index; i < endIndex; i++) {
          while (rows[i].length < maxCols) {
            rows[i].push("");
          }
        }
        index = endIndex;
        if (index < rows.length) {
          requestAnimationFrame(normalizeBatch);
        } else {
          resolve();
        }
      }

      normalizeBatch();
    });
  }

  function getColumnLetter(index) {
    let letter = "";
    while (index >= 0) {
      letter = String.fromCharCode((index % 26) + 65) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  }

  async function insertParsedData(rows, startRow, sheetName) {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getItemOrNullObject(sheetName);
      await context.sync();

      if (sheet.isNullObject) {
        throw new Error(`Sheet "${sheetName}" does not exist.`);
      }

      const endRow = startRow + rows.length - 1;
      const columnCount = rows[0].length;
      const rangeAddress = `A${startRow}:${getColumnLetter(columnCount - 1)}${endRow}`;

      console.log(`Range Address: ${rangeAddress}`);

      try {
        const range = sheet.getRange(rangeAddress);
        range.load("address");
        await context.sync();

        range.values = rows;
        await context.sync();
        console.log(`Inserted rows ${startRow} to ${endRow} in sheet "${sheetName}"`);
      } catch (error) {
        console.error("Error during Excel run:", error);
        throw new Error("Invalid range or sheet. Please check the range and sheet name.");
      }
    });
  }

  async function createOrClearSheet(sheetName) {
    await Excel.run(async (context) => {
      let sheet = context.workbook.worksheets.getItemOrNullObject(sheetName);
      await context.sync();

      if (!sheet.isNullObject) {
        sheet.getUsedRange().clear();
        console.log(`Cleared the "${sheetName}" sheet.`);
      } else {
        console.log(`${sheetName} sheet does not exist. Creating it.`);
        sheet = context.workbook.worksheets.add(sheetName);
        await context.sync();
      }
    }).catch((error) => {
      console.error("Error: " + error);
    });
  }

  async function renameSheet(serviceName) {
    return Excel.run(async (context) => {
      const tempSheet = context.workbook.worksheets.getItemOrNullObject(TEMP_SHEET_NAME);
      await context.sync();

      if (tempSheet.isNullObject) {
        console.error(`Sheet "${TEMP_SHEET_NAME}" does not exist.`);
        return { success: false, newSheetName: null };
      }

      let newSheetName;

      if (serviceName === "GENERATE ACE SHEET") {
        const cellI5 = tempSheet.getRange("J5");
        cellI5.load("values");
        await context.sync();

        let cellValue = cellI5.values[0][0];
        if (cellValue === "") {
          console.error("Cell J5 is empty");
          return { success: false, newSheetName: null };
        }

        // Split the string by underscores and take the last part
        const parts = cellValue.split("_");
        newSheetName = parts[parts.length - 1];

        // Trim and sanitize the sheet name
        newSheetName = newSheetName
          .substring(0, 31)
          .replace(/[:\/\\\?\*\[\]]/g, "")
          .trim();
      } else if (serviceName === "RUN COMPUTATION") {
        newSheetName = "outputs";
        const existingSheet = context.workbook.worksheets.getItemOrNullObject(newSheetName);
        await context.sync();

        if (!existingSheet.isNullObject) {
          console.log("Outputs sheet already exists. Skipping rename.");
          return { success: true, newSheetName: null };
        }
      } else {
        console.error("Unknown service name.");
        return { success: false, newSheetName: null };
      }

      if (newSheetName !== "outputs") {
        const existingSheet = context.workbook.worksheets.getItemOrNullObject(newSheetName);
        await context.sync();

        if (!existingSheet.isNullObject) {
          existingSheet.delete();
          await context.sync();
        }
      }

      if (newSheetName) {
        tempSheet.name = newSheetName;
        await context.sync();
        console.log(`Sheet renamed to ${newSheetName}`);
      }

      return { success: true, newSheetName: newSheetName };
    }).catch((error) => {
      console.error("Error: " + error);
      return { success: false, newSheetName: null };
    });
  }

  try {
    console.log("Starting the download and insertion process...");
    const stream = await fetchData();

    if (serviceName === "RUN COMPUTATION") {
      await createOrClearSheet(OUTPUTS_SHEET_NAME);
      await processStream(stream, OUTPUTS_SHEET_NAME);
      console.log("Data has been successfully inserted into the outputs sheet.");
      return { success: true, newSheetName: OUTPUTS_SHEET_NAME };
    } else {
      await createOrClearSheet(TEMP_SHEET_NAME);
      await processStream(stream, TEMP_SHEET_NAME);
      console.log("Data has been successfully inserted into the temp sheet.");

      const result = await renameSheet(serviceName);
      return result;
    }
  } catch (error) {
    console.error("Error:", error);
    console.log("Failed to fetch data. Please try again.");
    return { success: false, newSheetName: null };
  }
}
