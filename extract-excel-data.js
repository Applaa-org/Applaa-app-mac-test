const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Path to the Excel file
const excelFilePath = path.join(__dirname, 'docs', 'ApplaaIdeasDB.xlsx');

// Function to extract data from Excel file
function extractExcelData() {
  try {
    // Read the Excel file
    const workbook = XLSX.readFile(excelFilePath);
    
    // Get the first sheet name
    const sheetName = workbook.SheetNames[0];
    console.log('Sheet name:', sheetName);
    
    // Get the worksheet
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log('Total rows:', jsonData.length);
    console.log('\nFirst few rows:');
    jsonData.slice(0, 10).forEach((row, index) => {
      console.log(`Row ${index + 1}:`, row);
    });
    
    // Also convert with headers
    const jsonDataWithHeaders = XLSX.utils.sheet_to_json(worksheet);
    console.log('\nData with headers (first 3 entries):');
    jsonDataWithHeaders.slice(0, 3).forEach((row, index) => {
      console.log(`Entry ${index + 1}:`, JSON.stringify(row, null, 2));
    });
    
    // Save the extracted data to a JSON file for inspection
    const outputPath = path.join(__dirname, 'extracted-excel-data.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      sheetName,
      totalRows: jsonData.length,
      rawData: jsonData,
      dataWithHeaders: jsonDataWithHeaders
    }, null, 2));
    
    console.log(`\nData extracted and saved to: ${outputPath}`);
    
    return {
      sheetName,
      rawData: jsonData,
      dataWithHeaders: jsonDataWithHeaders
    };
    
  } catch (error) {
    console.error('Error extracting Excel data:', error);
    throw error;
  }
}

// Run the extraction
if (require.main === module) {
  extractExcelData();
}

module.exports = { extractExcelData };