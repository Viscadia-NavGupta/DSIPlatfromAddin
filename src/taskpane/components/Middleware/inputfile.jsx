
let workbookData = {};  // To store sheet data
let sheetNames = [];    // To store sheet names

export async function loadWorkbookData() {
  try {
    await Excel.run(async (context) => {
      let sheets = context.workbook.worksheets;
      sheets.load("items/name");
      await context.sync();

      workbookData = {};
      sheetNames = [];

      for (let sheet of sheets.items) {
        let sheetName = sheet.name.trim();
        sheetNames.push(sheetName);

        let usedRange;
        try {
          // Get the actual used range in the sheet
          usedRange = sheet.getUsedRange();
          usedRange.load(["values", "address"]);
          await context.sync();

          // Get used range address (e.g., "B3:F20")
          let usedAddress = usedRange.address.split("!")[1]; // Extract address after the sheet name
          let lastCell = usedAddress.split(":")[1]; // Extract last cell reference

          // Define the new range starting from A1 to the last used cell
          let expandedRange = sheet.getRange(`A1:${lastCell}`);
          expandedRange.load("values");
          await context.sync();

          workbookData[sheetName] = expandedRange.values;
        } catch (error) {
          console.warn(`Sheet ${sheetName} has no used range. Defaulting to A1.`);
          let defaultRange = sheet.getRange("A1");
          defaultRange.load("values");
          await context.sync();

          workbookData[sheetName] = defaultRange.values;
        }
      }

      console.log("Workbook Data Loaded", workbookData);
      console.log("Sheet Names:", sheetNames);
    });
  } catch (error) {
    console.error("Error loading workbook data:", error);
  }
}

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

        // Check for multi-cell range (e.g., "A1:B10")
        let match = cleanedAddress.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
        if (match) {
            let [, colStart, rowStart, colEnd, rowEnd] = match;
            return {
                rowCount: Math.abs(parseInt(rowEnd) - parseInt(rowStart)) + 1,
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

    // Extend vntControl array with 3 additional columns
    vntControl = await appendColumns(vntControl, 3);

    // Position value in the table
    const intRowOffsetData = 3;
    const intRowOffsetwks = 2;
    const intRowOffsetRange = 3;
    const intRowOffsetRSize = 4;
    const intRowOffsetCSize = 5;
    const intTableRowOffset = 1;

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
    let vntSave = new Array(maxrow + intTableRowOffset).fill(null).map(() => new Array(maxcol + 16).fill(""));

    //****************** Start Control table loop ********************//
    let lngCounter = 0;
    let blnRangeCheck = false;

    for (let i = 0; i < vntControl.length; i++) {
      if (vntControl[i][1] !== "Outputs" && vntControl[i][21] !== "") {
        let rangeAddress = vntControl[i][21];

        try {
          let tempRange =await getRangeFromUsedRanges(vntControl[i][3], workbookData)
           /// think about htis process to be fetched form used rnage 
            ///);
          let vntTempData = tempRange;

          if (Array.isArray(vntTempData)) {
            for (let r = 0; r < vntTempData.length; r++) {
              vntSave[lngCounter][0] = vntControl[i][0]; // Store model field name

              for (let j = 0; j < 15; j++) {
                let controlValue = vntControl[i][j + 4];
                vntSave[lngCounter][j + 1] = controlValue.startsWith("=") ? controlValue.slice(1) : controlValue;
              }

              for (let c = 0; c < vntTempData[r].length; c++) {
                vntSave[lngCounter][c + 16] = vntTempData[r][c];
              }

              lngCounter++;
            }
          } else {
            vntSave[lngCounter][17] = vntTempData;
            vntSave[lngCounter][0] = vntControl[i][0];

            for (let j = 0; j < 15; j++) {
              let controlValue = vntControl[i][j + 4];
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

    console.log("Data saved successfully!");

    if (blnRangeCheck) {
      console.error("Some named ranges or worksheets were missing.");
    }
  }).catch((error) => {
    console.error("Error in saveData:", error);
  });
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
            let possibleMatches = Object.keys(workbookData).filter(name => name.toLowerCase() === sheetName.toLowerCase());
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

        let resultArray = sheetData.slice(startRow, endRow + 1)
            .map(row => row.slice(startCol, endCol + 1));

        console.log(`Extracted Data from '${sheetName}'!${startCell}:${endCell}`, resultArray);
        return resultArray;
    } catch (error) {
        console.error("Error getting range data:", error);
        return [[]]; // ✅ Always return a 2D array on failure
    }
}


async function filterArrayByMultipleCriteria(sourceArray, criteria, countRow, countCol) {
  try {
      let filteredArray = [];
      let filteredRowCount = 0;

      console.log("🔍 Source Array:", sourceArray);
      console.log("🔍 Criteria:", criteria);

      // Iterate through each row in the source array
      for (let i = 0; i < sourceArray.length; i++) {
          let isMatch = true;

          // ✅ Ensure criteria comparison is correct
          let matchResult = evaluateCriteria(sourceArray[i][0], criteria["1"]);
          console.log(`🔍 Checking row ${i + 1}: Value = ${sourceArray[i][0]}, Criteria = ${criteria["1"]}, Match = ${matchResult}`);

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
                      console.log(`🔍 Checking col ${colNum}: Value = ${cellValue}, Criteria = ${criteriaValue}, Match = ${colMatch}`);

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

      console.log("✅ Filtered Rows Count:", filteredRowCount);
      console.log("✅ Filtered Data:", filteredArray);

      // ✅ Initialize the final filtered output array
      let vntFiltered = Array.from({ length: countRow }, () => Array(countCol).fill(""));

      if (filteredRowCount > 0) {
          for (let a = 0; a < filteredRowCount; a++) {
              for (let b = 0; b < countCol; b++) {
                  vntFiltered[a][b] = filteredArray[a][b + 16]; // ✅ Fixed Offset to Start from Column 11
              }
          }
      }

      console.log("✅ Final Output Array:", vntFiltered);
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
          vntControl = await appendColumns(vntControl, 3); // Append 3 extra columns

          console.log("✅ Named Range 'DataModel' successfully loaded!");

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

          let inputDataRange = inputSheet.getRange("A2").getResizedRange(usedRange.rowCount - 1, usedRange.columnCount - 1);
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
                  
                  
                  // ✅ 11. Filter Data
                  let vnt_filtereddata = await filterArrayByMultipleCriteria(
                      vnt_inputdata,
                      criteria,
                      vntControl[i][19],
                      vntControl[i][20]
                  );

                  // ✅ 12. Parse and Validate Target Range
                  let rangeStr = vntControl[i][21].trim();
                  let match = rangeStr.match(/^'?(.*?)'?!([A-Z]+\d+(:[A-Z]+\d+)?)$/);

                  if (!match) {
                      console.error(`❌ Invalid range format: ${rangeStr}`);
                      blnRangeCheck = true;
                      continue;
                  }

                  let sheetName = match[1].trim();
                  let rangeAddress = match[2].trim();

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

          console.log("✅ Inputs have been imported successfully!");

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
            console.log("All sheets are protected with the specified restrictions.");
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

            console.log(`📌 Target Range: ${rowCount} rows x ${colCount} cols = ${rangeCellCount} cells`);
            console.log(`📌 Data Size: ${dataRowCount} rows x ${dataColCount} cols = ${dataCellCount} cells`);

            // ✅ Validation check
            if (rangeCellCount !== dataCellCount) {
                console.error(`❌ Mismatch! Target range has ${rangeCellCount} cells, but data has ${dataCellCount} cells.`);
                return false;
            }

            // ✅ If validation passes, write data to Excel
            targetRange.values = vnt_filtereddata;
            await context.sync();
            console.log("✅ Data written successfully.");
        });
        return true;
    } catch (error) {
        console.error(`❌ Error in validateAndWriteData:`, error);
        return false;
    }
}

