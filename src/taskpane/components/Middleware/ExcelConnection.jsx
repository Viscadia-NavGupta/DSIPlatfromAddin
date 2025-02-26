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
        let usedRange = worksheet.getUsedRange();
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
export async function extractLevelData() {
  try {
    return await Excel.run(async (context) => {
      console.log("🔍 Starting extractLevelData function...");
      let workbook = context.workbook;
      let namedRange = workbook.names.getItemOrNullObject("DataModel");
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
            ([sheet, name]) => name === extractedName && (sheet === extractedSheet || (!extractedSheet && sheet === "Workbook"))
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
      let sheets = context.workbook.worksheets;
      sheets.load("items/name");
      await context.sync();

      workbookData = {};
      sheetNames = [];

      for (let sheet of sheets.items) {
        let sheetName = sheet.name.trim(); // Normalize sheet name
        sheetNames.push(sheetName);

        let usedRange = sheet.getUsedRange();
        usedRange.load(["values", "address"]);
        await context.sync();

        workbookData[sheetName] = usedRange.values;
      }

      console.log("Workbook Data Loaded", workbookData);
      console.log("Sheet Names:", sheetNames);
    });
  } catch (error) {
    console.error("Error loading workbook data:", error);
  }
}

export function parseRangeString(rangeStr) {
  let match = rangeStr.match(/^(.*?)!\s*([A-Z]+\d+)(?::([A-Z]+\d+))?$/);
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

  return { sheetName, startCell, endCell };
}

export function getRangeFromUsedRanges(rangeStr, workbookData) {
  try {
    let { sheetName, startCell, endCell } = parseRangeString(rangeStr);

    console.log(`Extracted Sheet Name: '${sheetName}'`);
    console.log("Available Sheets in workbookData:", Object.keys(workbookData));

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
      console.log(`Extracted Single Cell Data from '${sheetName}'!${startCell}:`, singleValue);
      return [[singleValue]]; // ✅ Convert single values to 2D array
    }

    let resultArray = sheetData.slice(startRow, endRow + 1).map((row) => row.slice(startCol, endCol + 1));

    console.log(`Extracted Data from '${sheetName}'!${startCell}:${endCell}`, resultArray);
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


export async function generateLongFormData(region) {
  try {
    await Excel.run(async (context) => {
      let workbook = context.workbook;
      let flatFileSheet = workbook.worksheets.getItem("Flat File");
      await context.sync();

      // Disable calculations for performance
      workbook.application.calculationMode = Excel.CalculationMode.manual;

      console.log("Fetching all sheet used ranges...");
      await loadWorkbookData();
      let initialSheetData = workbookData;

      if (!workbookData || Object.keys(workbookData).length === 0) {
        console.warn("No data found in the workbook.");
        return;
      }

      console.log("Extracting level data...");
      let extractedData = await extractLevelData();
      if (!extractedData || extractedData.length === 0) {
        console.warn("No extracted data available.");
        return;
      }

      console.log("Processing data transformation...");
      let longFormData = [];
      let headers = [];
      headers.push("flow_name", "region", "output_name", "input_output");
      for (let j = 1; j <= 15; j++) headers.push(`level_${j}`);
      headers.push("timeline", "value", "serial_number");
      longFormData.push(headers);

      let currentRow = 1;
      let transformFlag = false;
      let runflag = false;

      for (let i = 0; i < extractedData.length; i++) {
        let baseRow = currentRow;
        let levelData = [];
        let flag = Array(15).fill(null);

        let metricName = extractedData[i][0][0];
        let input_output = extractedData[i][0][5];
        let flow_name = "Primary";
        let region_name = region;
        let SingleCell_flag = false;
        console.log(`Processing: ${metricName}`);
        console.log(i);

        for (let a = 0; a < extractedData[i].length; a++) {
          if (typeof extractedData[i][a][2] === "string" && Boolean(isValidRange(extractedData[i][a][2]))) {
            let level1data = await getRangeFromUsedRanges(extractedData[i][a][2], workbookData);

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
              levelData = level1data.length >= level1data[0].length ? level1data : convert2DTo1D(level1data);
              if (level1data.length === 1 && level1data[0].length === 1) {
                SingleCell_flag = true;
              }
              runflag = true;
              transformFlag = true;
            }

            flag[a] = a;
          }
        }

        // ✅ Ensure `levelData` is valid
        let is2D = Array.isArray(levelData) && Array.isArray(levelData[0]);
        let Llevelsize = 0;
        let Ulevelsize = is2D ? levelData.length - 1 : levelData.length > 0 ? levelData.length - 1 : 0;

        if (SingleCell_flag=== true && is2D=== true){
          for (let b = Llevelsize; b <= Ulevelsize; b++){
            levelData[b][0]=levelData[0][0];
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

        // ✅ Ensure `timelineArray` is valid
        let timelineArray = extractedData[i][0][4]
          ? await getRangeFromUsedRanges(extractedData[i][0][4], workbookData)
          : "";
        if (!Array.isArray(timelineArray)) {
          timelineArray = [[timelineArray]];
        }

        // ✅ Prevent undefined values while looping
        for (let y = 0; y < rangeArray.length; y++) {
          if (!Array.isArray(rangeArray[y]) || rangeArray[y].length < 11) {
            console.warn(`Skipping row ${y}: insufficient columns`, rangeArray[y]);
            continue;
          }

          for (let k = 0; k < rangeArray[y].length - 15; k++) {
            let timelineValue = "Missing Value";
            if (Array.isArray(timelineArray) && Array.isArray(timelineArray[0])) {
              timelineValue = timelineArray[0][y] !== undefined ? timelineArray[0][y] : timelineArray[0][0];
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

      console.log("Writing long form data to Flat File sheet...");

    flatFileSheet.getUsedRange().clear(); // Clears contents, formats, and hyperlinks
    await context.sync();
      let outputRange = flatFileSheet
        .getRange("A1")
        .getResizedRange(longFormData.length - 1, longFormData[0].length - 1);
      outputRange.values = longFormData;
      outputRange.format.autofitColumns();
      outputRange.format.autofitRows();
      await context.sync();

      console.log(`Data processed successfully. Final row count: ${currentRow - 1}`);
      workbook.application.calculationMode = Excel.CalculationMode.automatic;
    });
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


