let workbookData = {}; // To store sheet data
let sheetNames = []; // To store sheet names
let namedRangesCache = null; // Cache for named ranges

/**
 * Get all used ranges from all worksheets
 */
export async function getAllSheetUsedRangesArray() {
  try {
    return await Excel.run(async (context) => {
      const sheets = context.workbook.worksheets;
      sheets.load("items/name");
      await context.sync();

      const sheetDataArray = [];
      const sheetPromises = sheets.items.map(async (sheet) => {
        const usedRange = sheet.getRange("A1").getSurroundingRegion();
        usedRange.load("values");
        await context.sync();
        
        sheetDataArray.push({
          sheetName: sheet.name,
          usedRangeValues: usedRange.values,
        });
      });
      
      await Promise.all(sheetPromises);
      return sheetDataArray;
    });
  } catch (error) {
    console.error("Error in getAllSheetUsedRangesArray:", error);
    return [];
  }
}

/**
 * Extract named ranges from the workbook
 */
/**
 * Extract named ranges from the workbook
 */
export async function extractNamedRanges() {
    // Return cached version if available
    if (namedRangesCache) return namedRangesCache;
    
    try {
      return await Excel.run(async (context) => {
        const workbook = context.workbook;
        const namedRangesArray = [];
  
        // Process workbook-level named ranges
        const workbookNamedRanges = workbook.names;
        workbookNamedRanges.load(["items/name", "items/type", "items/scope"]);
        await context.sync();
  
        for (const nameItem of workbookNamedRanges.items) {
          try {
            // Load more information about the named range first
            nameItem.load(["name", "type", "value"]);
            await context.sync();
            
            // Now get the range
            const range = nameItem.getRange();
            range.load("address");
            await context.sync();
            
            namedRangesArray.push(["Workbook", nameItem.name, range.address]);
          } catch (rangeError) {
            // Commented out error for named ranges not found
            // console.warn(`Couldn't get range for name "${nameItem.name}": ${rangeError}`);
            
            // Add the named range with a placeholder address
            namedRangesArray.push(["Workbook", nameItem.name, nameItem.value || "Unknown"]);
          }
        }
  
        // Process worksheet-level named ranges
        const worksheets = workbook.worksheets;
        worksheets.load("items/name");
        await context.sync();
  
        for (const sheet of worksheets.items) {
          const sheetNamedRanges = sheet.names;
          sheetNamedRanges.load(["items/name", "items/type", "items/scope"]);
          await context.sync();
  
          // Clean sheet name
          let sheetName = sheet.name;
          if (sheetName.startsWith("'") && sheetName.endsWith("'")) {
            sheetName = sheetName.slice(1, -1);
          }
  
          for (const nameItem of sheetNamedRanges.items) {
            try {
              nameItem.load(["name", "type", "value"]);
              await context.sync();
              
              const range = nameItem.getRange();
              range.load("address");
              await context.sync();
              
              namedRangesArray.push([sheetName, nameItem.name, range.address]);
            } catch (rangeError) {
              // Commented out error for named ranges not found
              // console.warn(`Couldn't get range for sheet "${sheetName}", name "${nameItem.name}": ${rangeError}`);
              
              namedRangesArray.push([sheetName, nameItem.name, nameItem.value || "Unknown"]);
            }
          }
        }
  
        // Cache the results
        namedRangesCache = namedRangesArray;
        return namedRangesArray;
      });
    } catch (error) {
      // Keep the main error logging since this indicates a more significant problem
      console.error("Error in extractNamedRanges:", error);
      return [];
    }
  }
/**
 * Extract data from the DataModel named range
 */
export async function extractLevelData() {
  try {
    return await Excel.run(async (context) => {
      console.log("Starting extractLevelData function...");
      const workbook = context.workbook;
      const namedRange = workbook.names.getItemOrNullObject("DataModel");
      await context.sync();

      if (namedRange.isNullObject) {
        console.error("DataModel range not found.");
        return [];
      }

      const dataModelRange = namedRange.getRange();
      dataModelRange.load("values");
      await context.sync();

      // Get all named ranges at once
      const namedRangesArray = await extractNamedRanges();
      
      const dataArray = dataModelRange.values;
      const outputArray = [];

      // First pass: Replace named ranges in dataArray
      for (let a = 2; a < 19; a++) {
        for (let b = 0; b < dataArray.length; b++) {
          // Skip empty cells
          if (!dataArray[b][a]) continue;
          
          // Clean up cell value
          if (typeof dataArray[b][a] === "string") {
            dataArray[b][a] = dataArray[b][a].replace("=", "").trim();
          }

          // Skip after cleanup if empty
          if (!dataArray[b][a]) continue;

          // Parse named range reference
          const cellValue = dataArray[b][a];
          let extractedSheet = null;
          let extractedName = cellValue;
          
          if (cellValue.includes("!")) {
            const parts = cellValue.split("!");
            extractedSheet = parts[0];
            extractedName = parts[1];
            
            // Clean sheet name
            if (extractedSheet && (extractedSheet.startsWith("'") || extractedSheet.endsWith("'"))) {
              extractedSheet = extractedSheet.replace(/^'|'$/g, "");
            }
          }

          // Find matching named range
          const matchedRange = namedRangesArray.find(
            ([sheet, name]) => 
              name === extractedName && 
              (sheet === extractedSheet || (!extractedSheet && sheet === "Workbook"))
          );

          if (matchedRange) {
            dataArray[b][a] = matchedRange[2]; // Use the address
          }
        }
      }

      // Second pass: Build the output array
      for (let i = 0; i < dataArray.length; i++) {
        const rowData = [];
        const modelFieldName = dataArray[i][0];

        for (let j = 1; j <= 15; j++) {
          const levelFlagCol = 3 + j;
          
          if (dataArray[i][levelFlagCol] !== "" && dataArray[i][1] !== "Inputs") {
            const tempArray = [
              modelFieldName,
              dataArray[i][3 + j],     // levelStandard
              dataArray[i][3 + j],     // levelHeader
              dataArray[i][3],         // levelValue
              dataArray[i][2],         // timeline
              dataArray[i][1],         // standardTerm
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
    console.error("Error in extractLevelData:", error);
    return [];
  }
}

/**
 * Load all workbook data into memory
 */
export async function loadWorkbookData() {
  try {
    await Excel.run(async (context) => {
      const sheets = context.workbook.worksheets;
      sheets.load("items/name");
      await context.sync();

      workbookData = {};
      sheetNames = [];

      // Process each sheet
      for (const sheet of sheets.items) {
        const sheetName = sheet.name.trim();
        sheetNames.push(sheetName);

        try {
          // Get the actual used range in the sheet
          const usedRange = sheet.getUsedRange();
          usedRange.load(["values", "address"]);
          await context.sync();

          // Extract address after the sheet name
          const usedAddress = usedRange.address.split("!")[1]; 
          
          // If there's no used range, default to A1
          if (!usedAddress) {
            const defaultRange = sheet.getRange("A1");
            defaultRange.load("values");
            await context.sync();
            workbookData[sheetName] = defaultRange.values;
            continue;
          }
          
          // Extract last cell reference
          const lastCell = usedAddress.split(":")[1] || "A1";

          // Define range from A1 to the last used cell
          const expandedRange = sheet.getRange(`A1:${lastCell}`);
          expandedRange.load("values");
          await context.sync();

          workbookData[sheetName] = expandedRange.values;
        } catch (error) {
          console.warn(`Sheet ${sheetName} has no used range. Defaulting to A1.`);
          const defaultRange = sheet.getRange("A1");
          defaultRange.load("values");
          await context.sync();
          workbookData[sheetName] = defaultRange.values;
        }
      }

      console.log("Workbook Data Loaded", Object.keys(workbookData));
      console.log("Sheet Names:", sheetNames);
    });
  } catch (error) {
    console.error("Error loading workbook data:", error);
  }
}

/**
 * Parse an Excel range string into components
 */
export function parseRangeString(rangeStr) {
  if (!rangeStr || typeof rangeStr !== "string") {
    throw new Error("Invalid range format: " + rangeStr);
  }

  const match = rangeStr.match(/^(.*?)!\s*([A-Z]+\d+)(?::([A-Z]+\d+))?$/);
  if (!match) {
    throw new Error("Invalid range format: " + rangeStr);
  }

  let sheetName = match[1].trim();
  const startCell = match[2];
  const endCell = match[3] || startCell; // If no endCell, single-cell reference

  // Remove surrounding quotes if present
  if (sheetName.startsWith("'") && sheetName.endsWith("'")) {
    sheetName = sheetName.slice(1, -1);
  }

  return { sheetName, startCell, endCell };
}

/**
 * Get data from a range using preloaded data
 */
export function getRangeFromUsedRanges(rangeStr, workbookData) {
  if (!rangeStr || typeof rangeStr !== "string") {
    console.error("Invalid range string:", rangeStr);
    return [[]];
  }
  
  try {
    const { sheetName, startCell, endCell } = parseRangeString(rangeStr);

    // Look for case-insensitive sheet name match
    if (!workbookData[sheetName]) {
      const possibleMatches = Object.keys(workbookData).filter(
        (name) => name.toLowerCase() === sheetName.toLowerCase()
      );
      
      if (possibleMatches.length > 0) {
        const correctedName = possibleMatches[0];
        console.warn(`Corrected sheet name from '${sheetName}' to '${correctedName}'`);
        sheetName = correctedName;
      } else {
        console.error(`Sheet '${sheetName}' not found in preloaded data.`);
        return [[]];
      }
    }

    const sheetData = workbookData[sheetName];
    if (!sheetData || !sheetData.length) {
      console.warn(`No data in sheet '${sheetName}'.`);
      return [[]];
    }

    // Convert Excel column letters to array indices
    function colToIndex(col) {
      let index = 0;
      for (let i = 0; i < col.length; i++) {
        index = index * 26 + (col.charCodeAt(i) - 64);
      }
      return index - 1;
    }

    // Parse cell coordinates
    const startRow = parseInt(startCell.match(/\d+/)[0], 10) - 1;
    const endRow = parseInt(endCell.match(/\d+/)[0], 10) - 1;
    const startCol = colToIndex(startCell.match(/[A-Z]+/)[0]);
    const endCol = colToIndex(endCell.match(/[A-Z]+/)[0]);

    // Check boundaries
    if (startRow < 0 || startRow >= sheetData.length || 
        startCol < 0 || startCol >= (sheetData[0]?.length || 0)) {
      console.warn(`Range '${rangeStr}' is out of bounds.`);
      return [[]];
    }

    // Single cell case
    if (startRow === endRow && startCol === endCol) {
      const singleValue = sheetData[startRow]?.[startCol];
      return [[singleValue]];
    }

    // Multiple cells case - extract the slice
    const resultArray = [];
    for (let i = startRow; i <= Math.min(endRow, sheetData.length - 1); i++) {
      if (sheetData[i]) {
        const row = sheetData[i].slice(
          startCol, 
          Math.min(endCol + 1, sheetData[i].length)
        );
        resultArray.push(row);
      }
    }

    return resultArray.length ? resultArray : [[]];
  } catch (error) {
    console.error("Error getting range data:", error, "for range:", rangeStr);
    return [[]];
  }
}

/**
 * Combine an array with a single cell value
 */
function combineArraysSingleCell(array1, array2) {
  // Ensure array1 is a valid 2D array
  if (!Array.isArray(array1) || array1.length === 0) {
    array1 = [[]];
  } else if (!Array.isArray(array1[0])) {
    array1 = array1.map(item => [item]);
  }

  // Extract single value from array2
  let singleValue;
  if (Array.isArray(array2) && array2.length === 1) {
    if (Array.isArray(array2[0]) && array2[0].length === 1) {
      singleValue = array2[0][0]; // 2D single-cell case
    } else if (!Array.isArray(array2[0])) {
      singleValue = array2[0]; // 1D single-cell case
    } else {
      console.error("Invalid format for array2");
      return array1; // Return original array on error
    }
  } else {
    console.error("Invalid format for array2");
    return array1;
  }

  // Create result array with extra column for the single value
  const rows = array1.length;
  const cols = array1[0]?.length || 0;
  
  const resultArray = array1.map(row => {
    const newRow = [...row];
    newRow.push(singleValue);
    return newRow;
  });

  return resultArray;
}

/**
 * Combine two arrays side by side
 */
function combineArrays(array1, array2) {
  // Normalize inputs to 2D arrays
  if (typeof array1 === "string") array1 = [[array1]];
  if (typeof array2 === "string") array2 = [[array2]];
  
  if (!Array.isArray(array1) || !Array.isArray(array2)) {
    return [["No arrays given."]];
  }

  // Convert 1D arrays to 2D if needed
  if (array1.length > 0 && !Array.isArray(array1[0])) {
    array1 = array1.map(item => [item]);
  }
  if (array2.length > 0 && !Array.isArray(array2[0])) {
    array2 = array2.map(item => [item]);
  }

  // Handle empty arrays
  if (array1.length === 0) array1 = [[]];
  if (array2.length === 0) array2 = [[]];

  // Get dimensions
  const colCount1 = array1[0]?.length || 0;
  const colCount2 = array2[0]?.length || 0;
  const maxRows = Math.max(array1.length, array2.length);

  // Create combined array
  const result = [];
  
  for (let i = 0; i < maxRows; i++) {
    const newRow = new Array(colCount2 + colCount1).fill(null);
    
    // Copy array2 values (left side)
    if (i < array2.length && array2[i]) {
      for (let j = 0; j < colCount2; j++) {
        newRow[j] = array2[i][j];
      }
    }
    
    // Copy array1 values (right side)
    if (i < array1.length && array1[i]) {
      for (let j = 0; j < colCount1; j++) {
        newRow[colCount2 + j] = array1[i][j];
      }
    }
    
    result.push(newRow);
  }

  return result;
}

/**
 * Convert a 2D array to a 1D array
 */
function convert2DTo1D(arr2D) {
  if (!Array.isArray(arr2D)) return [];
  
  const result = [];
  for (const row of arr2D) {
    if (Array.isArray(row)) {
      for (const cell of row) {
        result.push(cell);
      }
    } else {
      result.push(row);
    }
  }
  
  return result;
}

/**
 * Validate if a string is a valid Excel range
 */
export function isValidRange(rangeStr) {
  if (!rangeStr || typeof rangeStr !== "string") return false;
  
  // Optional quotes around sheet name, sheet name, exclamation mark, cell reference, optional range
  const rangePattern = /^(?:'([^']+)'|([A-Za-z0-9_]+))!\s*([A-Z]+[0-9]+)(?::([A-Z]+[0-9]+))?$/;
  
  return rangePattern.test(rangeStr);
}

/**
 * Generate long-form data for a specific region
 */
export async function generateLongFormData(region) {
  try {
    await Excel.run(async (context) => {
      console.time("total Time");
      // Disable screenupdating and set calculation to manual
      context.application.suspendScreenUpdatingUntilNextSync();
      const workbook = context.workbook;
      workbook.application.calculationMode = Excel.CalculationMode.manual;
      
      const flatFileSheet = workbook.worksheets.getItem("Flat File");
      await context.sync();

      // Step 1: Load all workbook data
      console.log("Loading workbook data...");
      await loadWorkbookData();
      
      if (!workbookData || Object.keys(workbookData).length === 0) {
        console.warn("No data found in the workbook.");
        return;
      }

      // Step 2: Extract level data
      console.log("Extracting level data...");
      const extractedData = await extractLevelData();
      
      if (!extractedData || extractedData.length === 0) {
        console.warn("No extracted data available.");
        return;
      }

      // Step 3: Process data transformation
      console.log("Processing data transformation...");
      
      // Prepare headers
      const longFormData = [];
      const headers = [
        "flow_name", "region", "output_name", "input_output",
        ...Array.from({length: 15}, (_, i) => `level_${i+1}`),
        "timeline", "value", "serial_number"
      ];
      longFormData.push(headers);

      let currentRow = 1;
      
      // Process each data group
      for (let i = 0; i < extractedData.length; i++) {
        const metricName = extractedData[i][0][0];
        const input_output = extractedData[i][0][5];
        const flow_name = "Primary";
        const region_name = region;
        
        console.log(`Processing: ${metricName} (${i+1}/${extractedData.length})`);
        
        let levelData = [];
        let flag = Array(15).fill(null);
        let runflag = false;
        let singleCellFlag = false;

        // Process level data
        for (let a = 0; a < extractedData[i].length; a++) {
          if (typeof extractedData[i][a][2] === "string" && isValidRange(extractedData[i][a][2])) {
            const levelRange = extractedData[i][a][2];
            const level1data = getRangeFromUsedRanges(levelRange, workbookData);
            
            if (!level1data || level1data.length === 0 || 
                (level1data.length === 1 && level1data[0].length === 0)) {
              continue;
            }

            // Determine if this is a single cell
            if (level1data.length === 1 && level1data[0].length === 1) {
              singleCellFlag = true;
            }

            // Combine data appropriately
            if (runflag) {
              if (level1data.length === 1 && level1data[0].length === 1) {
                levelData = combineArraysSingleCell(levelData, level1data);
              } else if (level1data.length >= level1data[0].length) {
                levelData = combineArrays(level1data, levelData);
              } else {
                levelData = combineArrays(convert2DTo1D(level1data), levelData);
              }
            } else {
              levelData = level1data.length >= level1data[0].length 
                ? level1data 
                : convert2DTo1D(level1data);
              runflag = true;
            }

            flag[a] = a;
          }
        }

        // Handle empty level data
        if (levelData.length === 0) {
          levelData = [[]];
        }

        // Prepare level headers
        const is2D = Array.isArray(levelData) && Array.isArray(levelData[0]);
        const levelCount = is2D ? levelData.length : levelData.length > 0 ? levelData.length : 1;
        
        // Create level header data
        const levelHeaders = Array(levelCount).fill().map(() => Array(15).fill("ALL"));
        
        // Fill in level headers
        let c = 1;
        for (let a = 0; a < 15; a++) {
          if (flag[a] === null || flag[a] === "") {
            // Use default value from extracted data or "ALL"
            for (let b = 0; b < levelCount; b++) {
              levelHeaders[b][a] = (extractedData[i].length > a && extractedData[i][a].length > 2) 
                ? (extractedData[i][a][2] || "ALL") 
                : "ALL";
            }
          } else {
            // Use value from level data
            for (let b = 0; b < levelCount; b++) {
              levelHeaders[b][a] = is2D && levelData[b] 
                ? levelData[b][c - 1] 
                : levelData[b] || "ALL";
            }
            c++;
          }
        }

        // Get value data
        let valueRange = [];
        if (extractedData[i][0][3]) {
          valueRange = getRangeFromUsedRanges(extractedData[i][0][3], workbookData);
          if (!Array.isArray(valueRange)) {
            valueRange = [[valueRange]];
          }
        } else {
          valueRange = [[]];
        }
        
        // Get timeline data
        let timelineArray = extractedData[i][0][4]
          ? getRangeFromUsedRanges(extractedData[i][0][4], workbookData)
          : [[""]];
          
        if (!Array.isArray(timelineArray)) {
          timelineArray = [[timelineArray]];
        }

        // Combine level headers with values
        let rangeArray;
        if (levelHeaders.length === 1) {
          rangeArray = combineArrays(valueRange, levelHeaders);
        } else if (valueRange.length === 1 && valueRange[0].length > 1) {
          rangeArray = combineArrays(convert2DTo1D(valueRange), levelHeaders);
        } else {
          rangeArray = combineArrays(valueRange, levelHeaders);
        }

        // Build final output rows
        for (let y = 0; y < rangeArray.length; y++) {
          if (!Array.isArray(rangeArray[y]) || rangeArray[y].length < 15) {
            continue; // Skip invalid rows
          }

          const valueCount = rangeArray[y].length - 15;
          
          for (let k = 0; k < valueCount; k++) {
            // Get timeline value
            let timelineValue = "Missing Value";
            if (Array.isArray(timelineArray) && timelineArray.length > 0 && Array.isArray(timelineArray[0])) {
              if (timelineArray[0].length > k) {
                timelineValue = timelineArray[0][k];
              } else if (timelineArray[0].length > 0) {
                timelineValue = timelineArray[0][0];
              }
            }

            // Create output row
            const row = [
              flow_name,
              region_name,
              metricName,
              input_output,
              ...rangeArray[y].slice(0, 15), // Level data
              timelineValue,
              rangeArray[y][k + 15], // Value
              currentRow
            ];
            
            longFormData.push(row);
            currentRow++;
          }
        }
      }

      // Step 4: Write data to sheet
      console.log(`Writing ${longFormData.length} rows to Flat File sheet...`);
      
      // Clear the sheet
      flatFileSheet.getUsedRange().clear();
      await context.sync();

      // Write data in chunks to avoid memory issues
      const chunkSize = 50000;
      for (let start = 0; start < longFormData.length; start += chunkSize) {
        const end = Math.min(start + chunkSize, longFormData.length);
        const chunk = longFormData.slice(start, end);
        
        const range = flatFileSheet.getRange(`A${start + 1}`);
        const outputRange = range.getResizedRange(chunk.length - 1, headers.length - 1);
        
        outputRange.values = chunk;
        await context.sync();
        
        console.log(`Wrote chunk ${start + 1} to ${end} of ${longFormData.length}`);
      }

      // Format the table
      const headerRange = flatFileSheet.getRange("A1:V1");
      headerRange.format.font.bold = true;
      
      // Autofit for better viewing
      flatFileSheet.getUsedRange().format.autofitColumns();
      await context.sync();
      
      console.log(`Data processed successfully. Final row count: ${currentRow - 1}`);
      console.timeEnd("total Time");
      
      // Restore calculation mode
      workbook.application.calculationMode = Excel.CalculationMode.automatic;
    });
  } catch (error) {
    console.error("Error in generateLongFormData:", error);
    await Excel.run(async (context) => {
      // Ensure calculation mode is restored
      context.workbook.application.calculationMode = Excel.CalculationMode.automatic;
      await context.sync();
    });
  }
}

/**
 * Set Excel calculation mode
 */
export async function setCalculationMode(mode) {
  try {
    await Excel.run(async (context) => {
      if (mode.toLowerCase() === "manual") {
        context.workbook.application.calculationMode = Excel.CalculationMode.manual;
      } else if (mode.toLowerCase() === "automatic") {
        context.workbook.application.calculationMode = Excel.CalculationMode.automatic;
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