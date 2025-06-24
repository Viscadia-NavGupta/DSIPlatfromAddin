let workbookData = {}; // To store sheet data
let sheetNames = []; // To store sheet names

export async function getAllSheetUsedRangesArray() {
  try {
    return await Excel.run(async (context) => {
      let workbook = context.workbook;
      let sheets = workbook.worksheets;
      let sheetDataArray = [];

      // Load the sheet collection
      sheets.load("items/name");
      await context.sync();

      for (let sheet of sheets.items) {
        let worksheet = sheet;

        // Ensure we start from A1 and get the surrounding used range
        let usedRange = worksheet.getRange("A1").getSurroundingRegion();
        usedRange.load("values");
        await context.sync();

        // Push the values as an object into the array
        sheetDataArray.push({
          sheetName: worksheet.name,
          usedRangeValues: usedRange.values,
        });
      }

      return sheetDataArray;
    });
  } catch (error) {
    console.error(error);
  }
}

//
export async function extractLevelData(DataModelNameRange) {
  try {
    return await Excel.run(async (context) => {
      // console.log("🔍 Starting extractLevelData function...");
      let workbook = context.workbook;
      let namedRange = workbook.names.getItemOrNullObject(DataModelNameRange);
      await context.sync();

      if (namedRange.isNullObject) {
        // console.error("❌ DataModel range not found.");
        return [];
      }

      let dataModelRange = namedRange.getRange();
      dataModelRange.load("values");
      await context.sync();

      // console.log("🔍 Extracting all named ranges...");
      let namedRangesArray = await extractNamedRanges(); // ✅ Fetch all named ranges from workbook

      // console.log("✅ Named ranges extracted successfully.");
      let dataArray = dataModelRange.values;
      let outputArray = [];

      // ✅ Replace named ranges in dataArray using namedRangesArray
      for (let a = 2; a < 19; a++) {
        for (let b = 0; b < dataArray.length; b++) {
          if (typeof dataArray[b][a] === "string") {
            dataArray[b][a] = dataArray[b][a].replace("=", "").trim(); // ✅ Trim spaces
          }

          if (!dataArray[b][a]) {
            // console.warn(`⚠️ Skipping empty or invalid named range at [${b}, ${a}].`);
            continue; // ✅ Skip empty values
          }

          // console.log(`🔎 Processing data: '${dataArray[b][a]}'...`);

          let [extractedSheet, extractedName] = dataArray[b][a].includes("!")
            ? dataArray[b][a].split("!")
            : [null, dataArray[b][a]];

          if (extractedSheet && (extractedSheet.startsWith("'") || extractedSheet.endsWith("'"))) {
            extractedSheet = extractedSheet.slice(1, -1); // ✅ Remove only leading/trailing quotes
          }

          let matchedRange = namedRangesArray.find(
            ([sheet, name]) =>
              name === extractedName && (sheet === extractedSheet || (!extractedSheet && sheet === "Workbook"))
          );

          if (matchedRange) {
            let [sheetName, name, address] = matchedRange;
            // console.log(`🔄 Mapping named range '${name}' from '${sheetName}' to address '${address}'.`);
            dataArray[b][a] = address;
          } else {
            // console.error(`🚨 ERROR: Named range '${dataArray[b][a]}' NOT FOUND in namedRangesArray.`);
          }
        }
      }

      for (let i = 0; i < dataArray.length; i++) {
        // Do not skip any rows
        let rowData = [];
        let modelFieldName = dataArray[i][0]; // Assuming "Model Field Name" is the first column

        for (let j = 1; j <= 15; j++) {
          // Process levels
          let levelFlagCol = 3 + j;
          let levelStandardCol = 3 + j;
          let levelHeaderCol = 3 + j;
          let levelValueCol = 3;
          let timelineCol = 2;
          let standardTermCol = 1;

          if (dataArray[i][levelFlagCol] !== "" && dataArray[i][1] !== "Inputs") {
            let tempArray = [
              modelFieldName,
              dataArray[i][levelStandardCol],
              dataArray[i][levelHeaderCol],
              dataArray[i][levelValueCol],
              dataArray[i][timelineCol],
              dataArray[i][standardTermCol],
            ];
            rowData.push(tempArray);
          }
        }

        if (rowData.length > 0) {
          outputArray.push(rowData);
        }
      }

      return outputArray;
    });
  } catch (error) {
    // console.error("🚨 ERROR in extractLevelData:", error);
    return [];
  }
}

export async function loadWorkbookData() {
  try {
    await Excel.run(async (context) => {
      // Load all worksheets at once
      let sheets = context.workbook.worksheets;
      sheets.load("items/name");
      await context.sync();

      workbookData = {};
      sheetNames = [];
      const rangesToLoad = [];

      // First pass: get all used ranges and their addresses
      for (let sheet of sheets.items) {
        let sheetName = sheet.name.trim();
        sheetNames.push(sheetName);

        // Get the used range for this sheet
        let usedRange = sheet.getUsedRange();
        usedRange.load(["address"]);
        rangesToLoad.push({ sheet, usedRange });
      }

      // Single sync call to get all used range addresses
      await context.sync();
      // console.log(sheetNames);
      // console.log(rangesToLoad);

      // Second pass: create expanded ranges from A1 and load values
      const expandedRanges = [];

      for (let item of rangesToLoad) {
        try {
          if (item.usedRange && item.usedRange.address) {
            // Get used range address (e.g., "Sheet1!B3:F20")
            let usedAddress = item.usedRange.address;
            let lastCell = usedAddress.split("!")[1].split(":")[1] || usedAddress.split("!")[1];

            // Define the new range starting from A1 to the last used cell
            let expandedRange = item.sheet.getRange(`A1:${lastCell}`);
            expandedRange.load("values");
            expandedRanges.push({
              sheetName: item.sheet.name.trim(),
              expandedRange
            });
          } else {
            // For empty sheets, just load A1
            let defaultRange = item.sheet.getRange("A1");
            defaultRange.load("values");
            expandedRanges.push({
              sheetName: item.sheet.name.trim(),
              expandedRange: defaultRange
            });
          }
        } catch (error) {
          console.warn(`Issue with sheet ${item.sheet.name}:`, error);
          let defaultRange = item.sheet.getRange("A1");
          defaultRange.load("values");
          expandedRanges.push({
            sheetName: item.sheet.name.trim(),
            expandedRange: defaultRange
          });
        }
      }

      // Final sync to get all expanded range values at once
      await context.sync();

      // Process all the expanded ranges
      for (let item of expandedRanges) {
        workbookData[item.sheetName] = item.expandedRange.values;
      }

      // console.log("Workbook Data Loaded", workbookData);
      // console.log("Sheet Names:", sheetNames);
      return workbookData;
    });
  } catch (error) {
    console.error("Error loading workbook data:", error);
    throw error;
  }
}

export function parseRangeString(rangeStr) {
  let match = rangeStr.match(/^(.*?)!\s*([A-Za-z]+\d+)(?::([A-Za-z]+\d+))?$/);
  if (!match) {
    throw new Error("Invalid range format: " + rangeStr);
  }

  let sheetName = match[1].trim();
  let startCell = match[2];
  let endCell = match[3] || startCell; // If no endCell, it's a single-cell reference

  // ✅ Ensure surrounding single quotes are removed properly
  if (sheetName.startsWith("'") && sheetName.endsWith("'")) {
    sheetName = sheetName.slice(1, -1);
  }

  // Uppercase both cells
  startCell = startCell.toUpperCase();
  endCell = endCell.toUpperCase();

  return { sheetName, startCell, endCell };
}

export function getRangeFromUsedRanges(rangeStr, workbookData) {
  try {
    let { sheetName, startCell, endCell } = parseRangeString(rangeStr);

    // console.log(`Extracted Sheet Name: '${sheetName}'`);
    // console.log("Available Sheets in workbookData:", Object.keys(workbookData));

    if (!workbookData[sheetName]) {
      let possibleMatches = Object.keys(workbookData).filter((name) => name.toLowerCase() === sheetName.toLowerCase());
      if (possibleMatches.length > 0) {
        sheetName = possibleMatches[0];
        console.warn(`Corrected sheet name to '${sheetName}'`);
      } else {
        console.error(`Sheet '${sheetName}' not found in preloaded data.`);
        return [[]]; // ✅ Always return a 2D array
      }
    }

    let sheetData = workbookData[sheetName];

    function colToIndex(col) {
      let index = 0;
      for (let i = 0; i < col.length; i++) {
        index = index * 26 + (col.charCodeAt(i) - 64);
      }
      return index - 1;
    }

    let startRow = parseInt(startCell.match(/\d+/)[0], 10) - 1;
    let endRow = parseInt(endCell.match(/\d+/)[0], 10) - 1;
    let startCol = colToIndex(startCell.match(/[A-Z]+/)[0]);
    let endCol = colToIndex(endCell.match(/[A-Z]+/)[0]);

    // ✅ Ensure data is within bounds
    if (!sheetData || sheetData.length <= startRow || !sheetData[startRow] || sheetData[startRow].length <= startCol) {
      console.warn(`Range '${rangeStr}' is out of bounds or empty.`);
      return [[]]; // ✅ Always return a 2D array
    }

    // ✅ Handle single-cell references by returning a 2D array
    if (startRow === endRow && startCol === endCol) {
      let singleValue = sheetData[startRow][startCol];
      // console.log(`Extracted Single Cell Data from '${sheetName}'!${startCell}:`, singleValue);
      return [[singleValue]]; // ✅ Convert single values to 2D array
    }

    let resultArray = sheetData.slice(startRow, endRow + 1).map((row) => row.slice(startCol, endCol + 1));

    // console.log(`Extracted Data from '${sheetName}'!${startCell}:${endCell}`, resultArray);
    return resultArray;
  } catch (error) {
    console.error("Error getting range data:", error);
    return [[]]; // ✅ Always return a 2D array on failure
  }
}


async function combineArraysSingleCell(array1, array2) {
  try {
    // ✅ Ensure `array1` is always an array
    if (!Array.isArray(array1)) {
      console.warn("array1 is not an array, converting to a default structure.");
      array1 = [[]]; // Ensures at least a 2D array
    } else if (array1.length === 0) {
      console.warn("array1 is empty, using a placeholder.");
      array1 = [[]];
    }

    // ✅ Validate `array2` and extract its single value
    let singleValue;
    if (Array.isArray(array2) && array2.length === 1 && Array.isArray(array2[0]) && array2[0].length === 1) {
      singleValue = array2[0][0]; // 2D single-cell case
    } else if (Array.isArray(array2) && array2.length === 1 && !Array.isArray(array2[0])) {
      singleValue = array2[0]; // 1D single-cell case
    } else {
      console.error("Invalid format: The second array must be a 1x1 array.");
      return [["Invalid array2 format"]];
    }

    // ✅ Determine dimensions of `array1`
    let rows1 = array1.length;
    let cols1 = Array.isArray(array1[0]) ? array1[0].length : 1;

    // ✅ Ensure `array1[0]` exists before accessing `.length`
    if (!Array.isArray(array1[0])) {
      console.warn("array1[0] is not an array, converting it to a single row.");
      array1 = array1.map((item) => [item]); // Convert 1D to 2D array
      cols1 = 1;
    }

    // ✅ Initialize the result array with an extra column
    let resultArray = new Array(rows1).fill(null).map(() => new Array(cols1 + 1));

    // ✅ Copy values from `array1` into `resultArray`
    for (let i = 0; i < rows1; i++) {
      for (let j = 0; j < cols1; j++) {
        resultArray[i][j] = array1[i][j];
      }
      // ✅ Append the single value from `array2` in the last column
      resultArray[i][cols1] = singleValue;
    }

    return resultArray;
  } catch (error) {
    console.error("Error in combineArraysSingleCell:", error);
    return [["Error in function"]];
  }
}

async function combineArrays(array1, array2) {
  try {
    // ✅ Convert strings to 2D arrays
    if (typeof array1 === "string") array1 = [[array1]];
    if (typeof array2 === "string") array2 = [[array2]];

    // ✅ Ensure both inputs are arrays
    if (!Array.isArray(array1) || !Array.isArray(array2)) {
      console.warn("One of the inputs is not an array. Returning placeholder.");
      return [["No arrays given."]];
    }

    // ✅ Ensure 1D arrays are converted to 2D arrays
    if (array1.length > 0 && !Array.isArray(array1[0])) {
      array1 = array1.map((item) => [item]);
    }
    if (array2.length > 0 && !Array.isArray(array2[0])) {
      array2 = array2.map((item) => [item]);
    }

    // ✅ Handle empty arrays
    if (array1.length === 0) array1 = [[]]; // At least one empty row
    if (array2.length === 0) array2 = [[]];

    // ✅ Validate `array1[0]` and `array2[0]`
    let colCountArray1 = array1[0] ? array1[0].length : 0;
    let colCountArray2 = array2[0] ? array2[0].length : 0;

    // Determine row counts (max of both arrays)
    let rowCount1 = array1.length;
    let rowCount2 = array2.length;
    let rowCount = Math.max(rowCount1, rowCount2);

    // Initialize combined array
    let combinedArray = new Array(rowCount).fill(null).map(() => new Array(colCountArray1 + colCountArray2).fill(null));

    // Copy array2 into the left columns
    for (let i = 0; i < rowCount2; i++) {
      if (Array.isArray(array2[i])) {
        // Ensure row exists
        for (let j = 0; j < colCountArray2; j++) {
          combinedArray[i][j] = array2[i][j];
        }
      }
    }

    // Append array1 to the right columns
    for (let i = 0; i < rowCount1; i++) {
      if (Array.isArray(array1[i])) {
        // Ensure row exists
        for (let j = 0; j < colCountArray1; j++) {
          combinedArray[i][colCountArray2 + j] = array1[i][j];
        }
      }
    }

    return combinedArray;
  } catch (error) {
    console.error("Error in combineArrays:", error);
    return [["Error occurred during array combination."]];
  }
}

function convert2DTo1D(arr2D) {
  try {
    // Check if input is a valid 2D array
    if (!Array.isArray(arr2D) || !Array.isArray(arr2D[0])) {
      throw new Error("Input must be a 2D array.");
    }

    // Flatten the 2D array into a 1D array
    let arr1D = [];
    for (let i = 0; i < arr2D.length; i++) {
      for (let j = 0; j < arr2D[i].length; j++) {
        arr1D.push(arr2D[i][j]);
      }
    }

    return arr1D;
  } catch (error) {
    console.error("Error in convert2DTo1D:", error);
    return null;
  }
}

export function isValidRange(rangeStr) {
  if (!rangeStr || typeof rangeStr !== "string") return false;

  // Fix: Make single quotes optional for sheet names
  const rangePattern = /^(?:'([^']+)'|([A-Za-z0-9_]+))!\s*([A-Z]+[0-9]+)(:[A-Z]+[0-9]+)?$/;

  return rangePattern.test(rangeStr);
}

export async function generateLongFormData(region, DataModelNameRange) {
  try {
    // Await the result from Excel.run and assign it to the variable 'data'
    const data = await Excel.run(async (context) => {
      console.log("📊 Starting generateLongFormData function...");
      console.time("Flatfile generation");
      let App = context.workbook.application;
      let workbook = context.workbook;
      let flatFileSheet = workbook.worksheets.getItem("Flat File");
      await context.sync();

      // Disable calculations for performance
      workbook.application.calculationMode = Excel.CalculationMode.manual;

      // console.log("Fetching all sheet used ranges...");
      await loadWorkbookData();
      // let initialSheetData = workbookData;

      if (!workbookData || Object.keys(workbookData).length === 0) {
        console.warn("No data found in the workbook.");
        return []; // Return an empty array if no data is found
      }

      // console.log("Extracting level data...");
      let extractedData = await extractLevelData(DataModelNameRange);
      if (!extractedData || extractedData.length === 0) {
        console.warn("No extracted data available.");
        return []; // Return an empty array if no extracted data is available
      }

      // console.log("Processing data transformation...");
      let longFormData = [];
      let headers = [];
      headers.push("flow_name", "region", "output_name", "input_output");
      for (let j = 1; j <= 15; j++) headers.push(`level_${j}`);
      headers.push("timeline", "value", "serial_number");
      longFormData.push(headers);

      let currentRow = 1;


      for (let i = 0; i < extractedData.length; i++) {
        let baseRow = currentRow;
        let levelData = [];
        let flag = Array(15).fill(null);
        let transformFlag = false;
        let runflag = false;


        let metricName = extractedData[i][0][0];
        let input_output = extractedData[i][0][5];
        let flow_name = "Primary";
        let region_name = region;
        let SingleCell_flag = false;
        // console.log(`Processing: ${metricName}`);
        // console.log(i);

        for (let a = 0; a < extractedData[i].length; a++) {
          if (
            typeof extractedData[i][a][2] === "string" &&
            Boolean(isValidRange(extractedData[i][a][2]))
          ) {
            let level1data = await getRangeFromUsedRanges(
              extractedData[i][a][2],
              workbookData
            );

            if (!level1data || level1data.length === 0) continue;

            if (runflag) {
              if (level1data.length === 1 && level1data[0].length === 1) {
                levelData = await combineArraysSingleCell(levelData, level1data);
              } else if (level1data.length >= level1data[0].length) {
                levelData = await combineArrays(level1data, levelData);
              } else {
                levelData = await combineArrays(convert2DTo1D(level1data), levelData);
              }
            } else {
              levelData =
                level1data.length >= level1data[0].length
                  ? level1data
                  : convert2DTo1D(level1data);
              if (level1data.length === 1 && level1data[0].length === 1) {
                SingleCell_flag = true;
              }
              runflag = true;
              transformFlag = true;
            }

            flag[a] = a;
          }
        }

        // Ensure `levelData` is valid
        let is2D = Array.isArray(levelData) && Array.isArray(levelData[0]);
        let Llevelsize = 0;
        let Ulevelsize = is2D ? levelData.length - 1 : levelData.length > 0 ? levelData.length - 1 : 0;

        if (SingleCell_flag === true && is2D === true) {
          for (let b = Llevelsize; b <= Ulevelsize; b++) {
            levelData[b][0] = levelData[0][0];
          }
        }

        let LHSdata = Array(Ulevelsize + 1)
          .fill()
          .map(() => Array(15).fill("ALL"));
        let c = 1;
        for (let a = 0; a < 15; a++) {
          if (flag[a] === null || flag[a] === "") {
            for (let b = Llevelsize; b <= Ulevelsize; b++) {
              if (extractedData[i].length > a && extractedData[i][a].length > 2) {
                LHSdata[b][a] = extractedData[i][a][2] || "ALL";
              } else {
                LHSdata[b][a] = "ALL";
              }
            }
          } else {
            for (let b = Llevelsize; b <= Ulevelsize; b++) {
              LHSdata[b][a] = is2D ? levelData[b][c - 1] : levelData[b];
            }
            c++;
          }
        }

        let valueRange = await getRangeFromUsedRanges(extractedData[i][0][3], workbookData);
        if (!Array.isArray(valueRange)) {
          valueRange = [[valueRange]];
        }

        let size1 = valueRange.length;
        let size2 = valueRange[0] ? valueRange[0].length : 1;

        let rangeArray;
        if (LHSdata.length === 1) {
          rangeArray = await combineArrays(valueRange, LHSdata);
        } else if (size1 <= size2 && size1 === 1) {
          rangeArray = await combineArrays(await convert2DTo1D(valueRange), LHSdata);
          transformFlag = true;
        } else {
          rangeArray = await combineArrays(valueRange, LHSdata);
        }

        let timelineArray = extractedData[i][0][4]
          ? await getRangeFromUsedRanges(extractedData[i][0][4], workbookData)
          : "";
        if (!Array.isArray(timelineArray)) {
          timelineArray = [[timelineArray]];
        }

        for (let y = 0; y < rangeArray.length; y++) {
          if (!Array.isArray(rangeArray[y]) || rangeArray[y].length < 11) {
            console.warn(`Skipping row ${y}: insufficient columns`, rangeArray[y]);
            continue;
          }

          for (let k = 0; k < rangeArray[y].length - 15; k++) {
            let timelineValue = "Missing Value";
            if (Array.isArray(timelineArray) && Array.isArray(timelineArray[0])) {
              timelineValue = timelineArray[0][k] !== undefined ? timelineArray[0][k] : timelineArray[0][0];
            }

            let row = [
              flow_name,
              region_name,
              metricName,
              input_output,
              ...rangeArray[y].slice(0, 15),
              timelineValue,
              rangeArray[y][k + 15],
              currentRow,
            ];
            longFormData.push(row);
            currentRow++;
          }
        }
      }
      console.clear();
      console.log("Writing long form data to Flat File sheet...");
      console.timeEnd("Flatfile generation");
      console.time("writing data");

      // flatFileSheet.getUsedRange().clear(); // Clears contents, formats, and hyperlinks
      // await context.sync();
      workbook = null;
      extractedData = null;
      const chunkSize = 50000; // Adjust based on performance testing
      App.suspendScreenUpdatingUntilNextSync();

      // let outputRange = flatFileSheet
      //   .getRange("A1")
      //   .getResizedRange(longFormData.length - 1, longFormData[0].length - 1);
      // outputRange.values = longFormData;
      // outputRange.format.autofitColumns();
      // outputRange.format.autofitRows();
      // await context.sync();
      console.timeEnd("writing data");
      console.log(`Data processed successfully. Final row count: ${currentRow - 1}`);
      // Return the longFormData array from within Excel.run
      return longFormData;
    });
    // Return the data obtained from Excel.run
    return data;
  } catch (error) {
    console.error("Error in generateLongFormData:", error);
  }
}


export async function extractNamedRanges() {
  try {
    return await Excel.run(async (context) => {
      let workbook = context.workbook;
      let namedRangesArray = [["Sheet Name", "Named Range", "Address"]];

      let workbookNamedRanges = workbook.names;
      workbookNamedRanges.load("items");
      await context.sync();

      let rangesToLoad = [];
      workbookNamedRanges.items.forEach((nameItem) => {
        let range = nameItem.getRangeOrNullObject();
        range.load(["address"]);
        namedRangesArray.push(["Workbook", nameItem.name, "Loading..."]);
        rangesToLoad.push({ name: nameItem.name, range, index: namedRangesArray.length - 1 });
      });

      await context.sync();
      rangesToLoad.forEach((item) => {
        namedRangesArray[item.index][2] = item.range.address || "No Address";
      });

      let worksheets = workbook.worksheets;
      worksheets.load("items");
      await context.sync();

      for (let sheet of worksheets.items) {
        let sheetNamedRanges = sheet.names;
        sheetNamedRanges.load("items");
        await context.sync();

        let sheetRangesToLoad = [];
        sheetNamedRanges.items.forEach((nameItem) => {
          let range = nameItem.getRangeOrNullObject();
          range.load(["address"]);
          let sheetName = sheet.name;
          if (sheetName.startsWith("'") || sheetName.endsWith("'")) {
            sheetName = sheetName.slice(1, -1);
          }
          namedRangesArray.push([sheetName, nameItem.name, "Loading..."]);
          sheetRangesToLoad.push({ name: nameItem.name, range, index: namedRangesArray.length - 1 });
        });

        await context.sync();
        sheetRangesToLoad.forEach((item) => {
          namedRangesArray[item.index][2] = item.range.address || "No Address";
        });
      }

      return namedRangesArray;
    });
  } catch (error) {
    return [];
  }
}

export async function setCalculationMode(mode) {
  try {
    await Excel.run(async (context) => {
      let workbook = context.workbook;

      // Set calculation mode based on user input
      if (mode.toLowerCase() === "manual") {
        workbook.application.calculationMode = Excel.CalculationMode.manual;
      } else if (mode.toLowerCase() === "automatic") {
        workbook.application.calculationMode = Excel.CalculationMode.automatic;
      } else {
        throw new Error("Invalid mode. Use 'manual' or 'automatic'.");
      }

      await context.sync();
      console.log(`Calculation mode set to: ${mode}`);
    });
  } catch (error) {
    console.error("Error setting calculation mode:", error);
  }
}


export function downloadExcelCSV(dataArray, fileName = "data.csv") {
  if (!dataArray || dataArray.length === 0) {
    console.error("No data provided for CSV generation.");
    return;
  }

  // Convert the array to a CSV string.
  const csvContent = dataArray
    .map((row) =>
      row
        .map((cell) => {
          const cellStr = cell !== null && cell !== undefined ? cell.toString() : "";
          // Escape double quotes by doubling them and wrap the value in quotes.
          return `"${cellStr.replace(/"/g, '""')}"`;
        })
        .join(",")
    )
    .join("\n");

  // Create a Blob with a MIME type that Excel recognizes.
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  // Create a temporary anchor element to trigger the download.
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName; // This is the filename that will be saved (e.g., data.csv)
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Clean up by revoking the object URL after a short delay.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}


export async function apiResponseToExcel(apiResponse, sheetName, startRange) {
  await Excel.run(async (context) => {
    // Set Excel calculation mode to manual to improve performance
    context.workbook.application.calculation = Excel.CalculationMode.manual;

    try {
      // Get the workbook and worksheets collection
      const worksheets = context.workbook.worksheets;
      worksheets.load('items/name');
      await context.sync();

      // Check if the sheet exists in the workbook
      const sheet = worksheets.items.find((item) => item.name === sheetName);

      if (!sheet) {
        throw new Error(`Sheet "${sheetName}" does not exist in the workbook.`);
      }

      // Extract 'results1' from the API response
      const results1 = apiResponse.results1;

      // Ensure results1 is an array and has data
      if (!Array.isArray(results1) || results1.length === 0) {
        console.error("No valid data found in results1.");
        return;
      }

      // Prepare data more efficiently
      const headers = Object.keys(results1[0]);
      const data = [
        headers,
        ...results1.map(item => headers.map(header => item[header]))
      ];

      // Clear the entire sheet before pasting new data
      sheet.getRange("A1:Z1000").clear(); // Adjust range as needed

      // Get the range starting from the given startRange
      const range = sheet.getRange(startRange);

      // Set values in a single operation
      const resizedRange = range.getResizedRange(data.length - 1, headers.length - 1);
      resizedRange.values = data;

      // Optional: Auto-fit columns for readability
      resizedRange.format.autofitColumns();

    } catch (error) {
      console.error("Error writing to Excel:", error);
    } finally {
      // Set Excel calculation mode back to automatic
      context.workbook.application.calculation = Excel.CalculationMode.automatic;

      // Sync changes
      await context.sync();
    }
  });
}


export async function readNamedRangeToArray(namedRangeName) {
  console.log("Starting to read named range:", namedRangeName);
  try {
    return await Excel.run(async (context) => {
      console.log("Excel context obtained.");

      // Use the workbook's names collection for workbook-level named ranges
      const names = context.workbook.names;
      names.load("items/name");
      await context.sync();

      console.log("Available workbook names:", names.items.map(n => n.name));

      let namedItem;
      try {
        namedItem = names.getItem(namedRangeName);
        console.log(`Workbook-level named item "${namedRangeName}" found.`);
      } catch (error) {
        console.error(`Error: Workbook-level named item "${namedRangeName}" does not exist.`, error);
        return [];
      }

      // Get the range associated with the named item
      const range = namedItem.getRange();
      range.load("values");
      await context.sync();

      const rangeValues = range.values;
      if (!rangeValues || rangeValues.length === 0) {
        console.error("No data found in the named range.");
        return [];
      }

      console.log("Array created from named range:", rangeValues);
      return rangeValues;
    });
  } catch (error) {
    console.error("Error during Excel.run execution:", error);
    return [];
  }
}



// -------------------------------------------------input file  functions--------------------------------------------------

async function appendColumns(arr, numNewCols) {
  return Excel.run(async (context) => {
    let workbook = context.workbook;
    let namedItems = workbook.names;
    namedItems.load("items/name");

    await context.sync(); // Load Named Ranges once

    let namedRangeMap = {}; // Store named ranges in a key-value map
    let rangesToLoad = [];

    // Load named ranges and their addresses
    namedItems.items.forEach(nameItem => {
      let range = nameItem.getRangeOrNullObject(); // Avoid errors on missing ranges
      range.load(["address"]); // Load only address
      namedRangeMap[nameItem.name] = range; // Store reference
      rangesToLoad.push(range);
    });

    await context.sync(); // Sync to get addresses

    // Now populate the map with actual addresses
    for (let name in namedRangeMap) {
      if (!namedRangeMap[name].isNullObject) {
        namedRangeMap[name] = namedRangeMap[name].address;
      }
    }

    let oldCols = arr[0].length;
    let newCols = oldCols + numNewCols;

    // Step 1: Create a new array and replace Named Ranges for every element
    let newArr = arr.map(row =>
      row.map(cell => {
        if (typeof cell === "string") {
          cell = cell.replace(/^=/, ""); // Remove '=' if present
          if (namedRangeMap[cell]) {
            return namedRangeMap[cell]; // Replace with its address
          }
        }
        return cell;
      }).concat(new Array(numNewCols).fill("")) // Append new columns
    );

    // Step 2: Process arr[i][4] to count rows and columns
    for (let i = 0; i < arr.length; i++) {
      let element = newArr[i][3]; // Process only column index 4

      if (element && typeof element === "string") {
        element = element.replace(/^=/, ""); // Remove '=' if present

        // If it's a Named Range, replace with its reference
        if (namedRangeMap[element]) {
          element = namedRangeMap[element];
        }

        // Count rows and columns for the evaluated range
        let rangeInfo = getRangeDimensions(element);
        if (rangeInfo.rowCount > 0 && rangeInfo.colCount > 0) {
          newArr[i][oldCols] = rangeInfo.rowCount;
          newArr[i][oldCols + 1] = rangeInfo.colCount;
          newArr[i][oldCols + 2] = element; // Store processed address
        }
      }
    }

    return newArr;
  }).catch((error) => {
    console.error("Error in appendColumns:", error);
    return arr; // Return original array in case of error
  });
}



// Function to determine row and column count
function getRangeDimensions(rangeAddress) {
  try {
    if (!rangeAddress) return { rowCount: 0, colCount: 0 };

    // Remove unnecessary characters (e.g., '=' or sheet name)
    let cleanedAddress = rangeAddress.replace(/^=.*?!/, "").replace(/'/g, "");

    // Convert to uppercase so that "e12" becomes "E12"
    cleanedAddress = cleanedAddress.toUpperCase();

    // Check for multi-cell range (e.g., "A1:B10")
    let match = cleanedAddress.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
    if (match) {
      let [, colStart, rowStart, colEnd, rowEnd] = match;
      return {
        rowCount: Math.abs(parseInt(rowEnd, 10) - parseInt(rowStart, 10)) + 1,
        colCount: Math.abs(columnToNumber(colEnd) - columnToNumber(colStart)) + 1,
      };
    }

    // Check for single-cell reference (e.g., "E6") and return {1,1}
    let singleCellMatch = cleanedAddress.match(/([A-Z]+)(\d+)/);
    if (singleCellMatch) {
      return { rowCount: 1, colCount: 1 };
    }

    return { rowCount: 0, colCount: 0 }; // Return 0 if invalid input
  } catch (error) {
    console.error("Error parsing range address:", error);
    return { rowCount: 0, colCount: 0 };
  }
}


// Helper function to convert column letters to numbers
function columnToNumber(col) {
  let num = 0;
  for (let i = 0; i < col.length; i++) {
    num = num * 26 + (col.charCodeAt(i) - "A".charCodeAt(0) + 1);
  }
  return num;
}


function sumColumn(arr, colIndex) {
  let total = 0;

  for (let i = 0; i < arr.length; i++) {
    let value = arr[i][colIndex];

    // Ensure value is neither null nor undefined and is a valid number
    if (value !== null && value !== undefined && value !== "" && !isNaN(value) && isFinite(value)) {
      total += parseFloat(value); // Convert and add
    }
  }

  return total;
}

function findMaxInColumn(arr, colIndex) {
  let maxVal = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < arr.length; i++) {
    let value = arr[i][colIndex];

    // Ensure value is neither null nor undefined and is a valid number
    if (value !== null && value !== undefined && value !== "" && !isNaN(value) && isFinite(value)) {
      maxVal = Math.max(maxVal, parseFloat(value));
    }
  }

  return maxVal === Number.NEGATIVE_INFINITY ? null : maxVal; // Return null if no valid numbers were found
}


export async function saveData() {
  return Excel.run(async (context) => {
    let workbook = context.workbook;
    let sheet = workbook.worksheets.getActiveWorksheet();
    let inputSheet = workbook.worksheets.getItem("Input File");

    //****************** Import Data ********************//
    let namedRange = workbook.names.getItemOrNullObject("DataModel");
    await context.sync(); // Load named range
    await loadWorkbookData();

    if (namedRange.isNullObject) {
      console.error("Error: DataModel range not found.");
      return;
    }

    let dataModelRange = namedRange.getRange();
    dataModelRange.load("values");
    await context.sync(); // Load values from DataModel range

    let vntControl = dataModelRange.values;
    vntControl = vntControl.map(row => row.slice(0, -1));

    // Extend vntControl array with 3 additional columns
    vntControl = await appendColumns(vntControl, 3);

    // Position value in the table
    const intRowOffsetData = 3;
    const intRowOffsetwks = 2;
    const intRowOffsetRange = 3;
    const intRowOffsetRSize = 4;
    const intRowOffsetCSize = 5;
    const intTableRowOffset = 0;

    // Ensure maxrow and maxcol are valid numbers
    let maxrow = sumColumn(vntControl, 19);
    let maxcol = findMaxInColumn(vntControl, 20);

    // Check for invalid values before creating the array
    if (isNaN(maxrow) || maxrow <= 0) {
      console.error("Invalid maxrow value:", maxrow);
      maxrow = 1; // Set a default minimum valid row count
    }
    if (isNaN(maxcol) || maxcol <= 0) {
      console.error("Invalid maxcol value:", maxcol);
      maxcol = 1; // Set a default minimum valid column count
    }

    // Create a new array with a valid size
    let vntSave = new Array(maxrow + intTableRowOffset).fill(null).map(() => new Array(maxcol + 17).fill(""));

    //****************** Start Control table loop ********************//
    let lngCounter = 0;
    let blnRangeCheck = false;

    for (let i = 0; i < vntControl.length; i++) {
      if (vntControl[i][1] !== "Outputs" && vntControl[i][21] !== "") {
        let rangeAddress = vntControl[i][21];

        try {
          let tempRange = await getRangeFromUsedRanges(vntControl[i][3], workbookData)
          /// think about htis process to be fetched form used rnage 
          ///);
          let vntTempData = tempRange;

          if (Array.isArray(vntTempData)) {
            for (let r = 0; r < vntTempData.length; r++) {
              vntSave[lngCounter][0] = vntControl[i][0]; // Store model field name

              for (let j = 0; j < 15; j++) {
                let controlValue = vntControl[i][j + 4];
                vntSave[lngCounter][16] =vntControl[i][3];
                vntSave[lngCounter][j + 1] = controlValue.startsWith("=") ? controlValue.slice(1) : controlValue;
              }

              for (let c = 0; c < vntTempData[r].length; c++) {
                vntSave[lngCounter][c + 17] = vntTempData[r][c];
              }

              lngCounter++;
            }
          } else {
            vntSave[lngCounter][18] = vntTempData;
            vntSave[lngCounter][0] = vntControl[i][0];

            for (let j = 0; j < 15; j++) {
              let controlValue = vntControl[i][j + 4];
              vntSave[lngCounter][16] =vntControl[i][3];
              vntSave[lngCounter][j + 1] = controlValue.startsWith("=") ? controlValue.slice(1) : controlValue;
            }

            lngCounter++;
          }
        } catch (error) {
          console.error("Invalid named range or worksheet missing:", rangeAddress);
          blnRangeCheck = true;
        }
      }
    }

    //****************** Save data to "Input File" sheet ********************//
    inputSheet.getUsedRange().clear();
    let saveRange = inputSheet.getRangeByIndexes(intTableRowOffset, 0, vntSave.length, vntSave[0].length);
    saveRange.values = vntSave;
    await context.sync();

    // console.log("Data saved successfully!");

    if (blnRangeCheck) {
      console.error("Some named ranges or worksheets were missing.");
    }
  }).catch((error) => {
    console.error("Error in saveData:", error);
  });
}


// export function parseRangeString(rangeStr) {
//     let match = rangeStr.match(/^(.*?)!\s*([A-Z]+\d+)(?::([A-Z]+\d+))?$/);
//     if (!match) {
//         throw new Error("Invalid range format: " + rangeStr);
//     }

//     let sheetName = match[1].trim();
//     let startCell = match[2];
//     let endCell = match[3] || startCell; // If no endCell, it's a single-cell reference

//     // ✅ Ensure surrounding single quotes are removed properly
//     if (sheetName.startsWith("'") && sheetName.endsWith("'")) {
//         sheetName = sheetName.slice(1, -1);
//     }

//     return { sheetName, startCell, endCell };
// }



// export function getRangeFromUsedRanges(rangeStr, workbookData) {
//     try {
//         let { sheetName, startCell, endCell } = parseRangeString(rangeStr);

//         // console.log(`Extracted Sheet Name: '${sheetName}'`);
//         // console.log("Available Sheets in workbookData:", Object.keys(workbookData));

//         if (!workbookData[sheetName]) {
//             let possibleMatches = Object.keys(workbookData).filter(name => name.toLowerCase() === sheetName.toLowerCase());
//             if (possibleMatches.length > 0) {
//                 sheetName = possibleMatches[0];
//                 console.warn(`Corrected sheet name to '${sheetName}'`);
//             } else {
//                 console.error(`Sheet '${sheetName}' not found in preloaded data.`);
//                 return [[]]; // ✅ Always return a 2D array
//             }
//         }

//         let sheetData = workbookData[sheetName];

//         function colToIndex(col) {
//             let index = 0;
//             for (let i = 0; i < col.length; i++) {
//                 index = index * 26 + (col.charCodeAt(i) - 64);
//             }
//             return index - 1;
//         }

//         let startRow = parseInt(startCell.match(/\d+/)[0], 10) - 1;
//         let endRow = parseInt(endCell.match(/\d+/)[0], 10) - 1;
//         let startCol = colToIndex(startCell.match(/[A-Z]+/)[0]);
//         let endCol = colToIndex(endCell.match(/[A-Z]+/)[0]);

//         // ✅ Ensure data is within bounds
//         if (!sheetData || sheetData.length <= startRow || !sheetData[startRow] || sheetData[startRow].length <= startCol) {
//             console.warn(`Range '${rangeStr}' is out of bounds or empty.`);
//             return [[]]; // ✅ Always return a 2D array
//         }

//         // ✅ Handle single-cell references by returning a 2D array
//         if (startRow === endRow && startCol === endCol) {
//             let singleValue = sheetData[startRow][startCol];
//             // console.log(`Extracted Single Cell Data from '${sheetName}'!${startCell}:`, singleValue);
//             return [[singleValue]]; // ✅ Convert single values to 2D array
//         }

//         let resultArray = sheetData.slice(startRow, endRow + 1)
//             .map(row => row.slice(startCol, endCol + 1));

//         // console.log(`Extracted Data from '${sheetName}'!${startCell}:${endCell}`, resultArray);
//         return resultArray;
//     } catch (error) {
//         console.error("Error getting range data:", error);
//         return [[]]; // ✅ Always return a 2D array on failure
//     }
// }


async function filterArrayByMultipleCriteria(sourceArray, criteria, countRow, countCol) {
  try {
    let filteredArray = [];
    let filteredRowCount = 0;

    // console.log("🔍 Source Array:", sourceArray);
    // console.log("🔍 Criteria:", criteria);

    // Iterate through each row in the source array
    for (let i = 0; i < sourceArray.length; i++) {
      let isMatch = true;

      // ✅ Ensure criteria comparison is correct
      let matchResult = evaluateCriteria(sourceArray[i][0], criteria["1"]);
      // console.log(`🔍 Checking row ${i + 1}: Value = ${sourceArray[i][0]}, Criteria = ${criteria["1"]}, Match = ${matchResult}`);

      if (!matchResult) {
        isMatch = false;
      } else {
        // ✅ Convert criteria keys to numbers before comparing
        for (let col in criteria) {
          let colNum = Number(col);
          if (colNum > 1) {
            let cellValue = sourceArray[i][colNum - 1];
            let criteriaValue = criteria[colNum];

            let colMatch = evaluateCriteria(cellValue, criteriaValue);
            // console.log(`🔍 Checking col ${colNum}: Value = ${cellValue}, Criteria = ${criteriaValue}, Match = ${colMatch}`);

            if (!colMatch) {
              isMatch = false;
              break;
            }
          }
        }
      }

      // ✅ If all criteria match, add row to filtered array
      if (isMatch) {
        filteredArray.push(sourceArray[i]);
        filteredRowCount++;
      }
    }

    // console.log("✅ Filtered Rows Count:", filteredRowCount);
    // console.log("✅ Filtered Data:", filteredArray);

    // ✅ Initialize the final filtered output array
    let vntFiltered = Array.from({ length: countRow }, () => Array(countCol).fill(""));

    if (filteredRowCount > 0) {
      for (let a = 0; a < filteredRowCount; a++) {
        for (let b = 0; b < countCol; b++) {
          vntFiltered[a][b] = filteredArray[a][b + 17]; // ✅ Fixed Offset to Start from Column 11
        }
      }
    }

    // console.log("✅ Final Output Array:", vntFiltered);
    return vntFiltered;
  } catch (error) {
    console.error("❌ Error in filterArrayByMultipleCriteria:", error);
    return [[]]; // Return empty array in case of error
  }
}

// ✅ Fixed `evaluateCriteria()` function
function evaluateCriteria(value, criteria) {
  try {
    if ((criteria === "" || criteria === null) && (value === "" || value === null)) {
      return true;
    }

    if (typeof criteria === "string" && criteria.includes(",")) {
      let parts = criteria.split(",");
      let operator = parts[0].trim();
      let target = parts[1].trim();

      if (!isNaN(target)) {
        target = parseFloat(target);
      }

      switch (operator) {
        case ">":
          return value > target;
        case "<":
          return value < target;
        case "=":
          return value == target;
        case ">=":
          return value >= target;
        case "<=":
          return value <= target;
        case "<>":
          return value != target;
        default:
          console.warn(`⚠️ Invalid operator: ${operator}`);
          return false;
      }
    }

    return value == criteria; // Default equality check
  } catch (error) {
    console.error("❌ Error in evaluateCriteria:", error);
    return false;
  }
}


/// import assumptions code 

export async function exportData2() {
  try {
    await Excel.run(async (context) => {
      const workbook = context.workbook;

      // ✅ 1. Check if "Data Model" sheet exists
      let dataModelSheet;
      try {
        dataModelSheet = workbook.worksheets.getItem("Data Model");
      } catch (err) {
        console.error("❌ Worksheet 'Data Model' not found.");
        return;
      }

      // ✅ 2. Check if "Input File" sheet exists
      let inputSheet;
      try {
        inputSheet = workbook.worksheets.getItem("Input File");
      } catch (err) {
        console.error("❌ Worksheet 'Input File' not found.");
        return;
      }

      // ✅ 3. Unhide "Data Model" sheet if hidden
      dataModelSheet.load("visibility");
      await context.sync();
      if (dataModelSheet.visibility === Excel.SheetVisibility.hidden) {
        console.warn("⚠️ 'Data Model' sheet is hidden. Unhiding...");
        dataModelSheet.visibility = Excel.SheetVisibility.visible;
        await context.sync();
      }

      // ✅ 4. Try getting the Named Range (Check Workbook Level First)
      let vntControlRange = workbook.names.getItemOrNullObject("DataModel");
      await context.sync();

      // ✅ 5. If Named Range is Missing, Check If It's a Table
      if (vntControlRange.isNullObject) {
        console.warn("⚠️ Named range 'DataModel' not found as a Named Range. Checking as a Table...");
        try {
          let table = workbook.tables.getItem("DataModel");
          vntControlRange = table.getRange();
        } catch (err) {
          console.error("❌ Error: 'DataModel' is neither a Named Range nor a Table.");
          return;
        }
      }

      // ✅ 6. Load Named Range Values
      let dataModelRange = vntControlRange.getRange();
      dataModelRange.load("values");
      await context.sync();

      let vntControl = dataModelRange.values;
      vntControl = vntControl.map(row => row.slice(0, -1));
      vntControl = await appendColumns(vntControl, 3); // Append 3 extra columns

      // console.log("✅ Named Range 'DataModel' successfully loaded!");

      // ✅ 7. Compute max row & max col
      let maxrow = sumColumn(vntControl, 19);
      let maxcol = findMaxInColumn(vntControl, 20);

      maxrow = isNaN(maxrow) || maxrow <= 0 ? 1 : maxrow;
      maxcol = isNaN(maxcol) || maxcol <= 0 ? 1 : maxcol;

      let vntSave = Array.from({ length: maxrow + 1 }, () => Array(maxcol + 11).fill(""));

      // ✅ 8. Load Input File Data (Fixed `rowCount` error)
      let usedRange = inputSheet.getUsedRange();
      usedRange.load(["rowCount", "columnCount"]);
      await context.sync();

      let inputDataRange = inputSheet.getRange("A1").getResizedRange(usedRange.rowCount - 1, usedRange.columnCount - 1);
      inputDataRange.load("values");
      await context.sync();

      let vnt_inputdata = inputDataRange.values;
      if (!vnt_inputdata || vnt_inputdata.length === 0) {
        console.warn("⚠️ Warning: No input data found in 'Input File'.");
        return;
      }

      // ✅ 9. Process Control Table
      let blnRangeCheck = false;
      for (let i = 0; i < vntControl.length; i++) {
        if (vntControl[i][1] !== "Outputs" && vntControl[i][21]) {
          // Remove "=" from control table expressions
          for (let j = 4; j < 19; j++) {
            if (typeof vntControl[i][j] === "string" && vntControl[i][j].startsWith("=")) {
              vntControl[i][j] = vntControl[i][j].slice(1);
            }
          }

          let criteria = {};
          criteria[1] = typeof vntControl[i][0] === "string" ? vntControl[i][0].replace(/^'/, "") : vntControl[i][0]; // Remove only leading quote

          for (let j = 2; j <= 16; j++) {
            criteria[j] = typeof vntControl[i][j + 2] === "string" ? vntControl[i][j + 2].replace(/^'/, "") : vntControl[i][j + 2]; // Remove only leading quote
          }
          criteria[17] = typeof vntControl[i][3] === "string" ? vntControl[i][3].replace(/^'/, "") : vntControl[i][3]; // Remove only leading quote

          // ✅ 11. Filter Data
          let vnt_filtereddata = await filterArrayByMultipleCriteria(
            vnt_inputdata,
            criteria,
            vntControl[i][19],
            vntControl[i][20]
          );

          // ✅ 12. Parse and Validate Target Range
          let rangeStr = vntControl[i][21].trim();
          let match = rangeStr.match(/^'?(.*?)'?!([A-Za-z]+\d+(?::[A-Za-z]+\d+)?)$/);

          if (!match) {
            console.error(`❌ Invalid range format: ${rangeStr}`);
            blnRangeCheck = true;
            continue;
          }

          let sheetName = match[1].trim();
          let rangeAddress = match[2].trim();
          rangeAddress = rangeAddress.toUpperCase();

          try {
            let targetSheet = workbook.worksheets.getItem(sheetName);
            let targetRange = targetSheet.getRange(rangeAddress);

            // ✅ 13. Write Filtered Data to Excel
            // targetRange = targetRange.getResizedRange(vntControl[i][14], vntControl[i][15]);
            //   await validateAndWriteData(sheetName, rangeAddress, vnt_filtereddata);
            targetRange.values = vnt_filtereddata;
            await context.sync();
          } catch (error) {
            console.error(`❌ Error: Unable to access range '${rangeStr}'.`);
            blnRangeCheck = true;
            continue;
          }
        }
      }

      // console.log("✅ Inputs have been imported successfully!");
      dataModelSheet.visibility === Excel.SheetVisibility.hidden;
      await context.sync();


      // ✅ 14. Error Logging
      if (blnRangeCheck) {
        console.error("⚠️ Some named ranges or worksheets were missing.");
      }
    });
  } catch (error) {
    console.error("❌ Error in exportData2:", error);
  }
}


export async function protectAllSheets(password) {
  try {
    await Excel.run(async (context) => {
      const workbook = context.workbook;
      const worksheets = workbook.worksheets;

      // Load all worksheet names
      worksheets.load("items/name");

      await context.sync();

      worksheets.items.forEach(sheet => {
        sheet.protection.protect({
          allowInsertRows: false,
          allowInsertColumns: false,
          allowInsertHyperlinks: false,
          allowDeleteRows: false,
          allowDeleteColumns: false,
          allowFormatCells: true,  // Users can format cells
          allowFormatRows: false,  // Prevent row formatting
          allowFormatColumns: false, // Prevent column formatting
          allowSort: false,  // Prevent sorting
          allowAutoFilter: false, // Prevent auto-filter changes
          allowPivotTables: false  // Prevent pivot table modifications
        }, password);
      });

      await context.sync();
      // console.log("All sheets are protected with the specified restrictions.");
    });
  } catch (error) {
    console.error("Error protecting sheets:", error);
  }
}

async function validateAndWriteData(sheetName, rangeAddress, vnt_filtereddata) {
  try {
    await Excel.run(async (context) => {
      let sheet = context.workbook.worksheets.getItem(sheetName);
      let targetRange = sheet.getRange(rangeAddress);

      // ✅ Load rowCount and columnCount explicitly before using them
      targetRange.load(["rowCount", "columnCount"]);
      await context.sync(); // Ensure the properties are loaded

      // Get target range dimensions
      let rowCount = targetRange.rowCount;
      let colCount = targetRange.columnCount;
      let rangeCellCount = rowCount * colCount;

      // Get vnt_filtereddata dimensions
      let dataRowCount = vnt_filtereddata.length;
      let dataColCount = vnt_filtereddata[0]?.length || 0; // Handle potential empty arrays
      let dataCellCount = dataRowCount * dataColCount;

      // console.log(`📌 Target Range: ${rowCount} rows x ${colCount} cols = ${rangeCellCount} cells`);
      // console.log(`📌 Data Size: ${dataRowCount} rows x ${dataColCount} cols = ${dataCellCount} cells`);

      // ✅ Validation check
      if (rangeCellCount !== dataCellCount) {
        console.error(`❌ Mismatch! Target range has ${rangeCellCount} cells, but data has ${dataCellCount} cells.`);
        return false;
      }

      // ✅ If validation passes, write data to Excel
      targetRange.values = vnt_filtereddata;
      await context.sync();
      // console.log("✅ Data written successfully.");
    });
    return true;
  } catch (error) {
    console.error(`❌ Error in validateAndWriteData:`, error);
    return false;
  }
}

export async function refreshPivotTable(sheetName, pivotTableName) {
  try {
    await Excel.run(async (context) => {
      // 1) Get the worksheet: either by name or default to active sheet
      const sheet = sheetName
        ? context.workbook.worksheets.getItem(sheetName)
        : context.workbook.worksheets.getActiveWorksheet();

      // 2) Get the pivot table by name
      const pivot = sheet.pivotTables.getItem(pivotTableName);

      // 3) Refresh it
      pivot.refresh();

      // 4) Sync back to Excel
      await context.sync();
    });
    console.log(`Pivot "${pivotTableName}" refreshed!`);
  } catch (error) {
    console.error(`Error refreshing pivot "${pivotTableName}":`, error);
  }
}


export async function MetaDataSyncwithoutheaders(apiResponse, sheetName, startRange) {
  await Excel.run(async (context) => {
    context.workbook.application.calculation = Excel.CalculationMode.manual;

    try {
      // Load sheets
      const worksheets = context.workbook.worksheets;
      worksheets.load('items/name');
      await context.sync();

      const sheet = worksheets.items.find(item => item.name === sheetName);
      if (!sheet) throw new Error(`Sheet "${sheetName}" not found.`);

      const results = apiResponse.results1;
      if (!Array.isArray(results) || results.length === 0) {
        console.error('No data available to write.');
        return;
      }

      const columns = Object.keys(results[0]);
      const dataRows = results.map(row =>
        columns.map(col => row[col])
      );

      const table = sheet.tables.getItem('Table5');

      // Clear old data and formatting
      sheet.getRange('A2:Z1000').clear(Excel.ClearApplyTo.all);

      // Write new data
      const dataStartCell = sheet.getRange(startRange);
      const dataRange = dataStartCell.getResizedRange(
        dataRows.length - 1,
        columns.length - 1
      );
      dataRange.values = dataRows;

      // Now resize the table including header row
      const headerRowCell = dataStartCell.getOffsetRange(-1, 0); // startRange is A2, header is A1
      const fullTableRange = headerRowCell.getResizedRange(
        dataRows.length, // +1 header
        columns.length - 1
      );
      table.resize(fullTableRange);

      // Auto-fit
      fullTableRange.format.autofitColumns();

    } catch (error) {
      console.error('Error writing to Excel:', error);
    } finally {
      context.workbook.application.calculation = Excel.CalculationMode.automatic;
      await context.sync();
    }
  });
}


export async function calculateAndFetchColumnAN(sheetName) {
  return Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItem(sheetName);

    // 🧮 Sheet-level calculation (equivalent to VBA's Sheet.Calculate)
    sheet.calculate(true); // true = force calculation even if not marked as dirty
    await context.sync();

    // Load used range properties in one go
    const used = sheet.getUsedRange();
    used.load('rowCount');
    await context.sync();

    const rowCount = used.rowCount;
    if (rowCount < 1) return [];

    // 📌 Get column AN (index 39) values
    const rangeAN = sheet.getRangeByIndexes(0, 39, rowCount, 1);
    rangeAN.load('values');
    await context.sync();

    // Return filtered non-empty values
    return rangeAN.values.flat().filter(val => val !== null && val !== undefined && val !== "");
  });
}




export async function writeYesNoToNamedRange(rangeName, isYes) {
  return Excel.run(async (context) => {
    const namedItem = context.workbook.names.getItem(rangeName);
    const range = namedItem.getRange();

    // First clear the cell (this helps Excel treat the next write as a true "Change")
    range.values = [[ "" ]];
    await context.sync();

    // Now write the actual Yes/No text
    const textValue = isYes ? "Yes" : "No";
    range.values = [[ textValue ]];
    await context.sync();
  });
}
