const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// File paths
const files = [
  '202509_Country Price List A1 IMSI Sponsoring.xlsx',
  '20250205 Monogoto TGS UK V1.xlsx',
  'Tele2 data fee June-23 analysis.xlsx'
];

function analyzeExcelFile(filePath) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`ANALYZING: ${filePath}`);
  console.log(`${'='.repeat(80)}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  try {
    const workbook = XLSX.readFile(filePath);
    
    console.log(`\nWorkbook sheets: ${workbook.SheetNames.join(', ')}`);
    
    // Analyze each sheet
    workbook.SheetNames.forEach((sheetName, sheetIndex) => {
      console.log(`\n--- SHEET ${sheetIndex + 1}: "${sheetName}" ---`);
      
      const worksheet = workbook.Sheets[sheetName];
      
      // Get the range of the sheet
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      console.log(`Range: ${worksheet['!ref'] || 'Empty sheet'}`);
      
      if (worksheet['!ref']) {
        // Convert to JSON with headers as first row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        console.log(`Total rows: ${jsonData.length}`);
        
        // Show first few rows to understand structure
        console.log('\nFirst 5 rows:');
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
          console.log(`Row ${i + 1}:`, jsonData[i]);
        }
        
        // Look for header patterns and identify potential TADIG columns
        console.log('\nLooking for headers and TADIG patterns...');
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i];
          if (row && row.length > 0) {
            const rowStr = row.join(' | ').toLowerCase();
            
            // Check for header-like patterns
            const headerKeywords = ['country', 'operator', 'tadig', 'price', 'cost', 'data', 'sms', 'voice', 'currency', 'network', 'mno'];
            const foundKeywords = headerKeywords.filter(keyword => rowStr.includes(keyword));
            
            if (foundKeywords.length >= 3) {
              console.log(`  Potential header row ${i + 1}:`, row);
              console.log(`  Found keywords:`, foundKeywords);
            }
            
            // Look for TADIG-like codes (5-6 char alphanumeric)
            row.forEach((cell, colIndex) => {
              if (typeof cell === 'string' && /^[A-Z]{2,3}[A-Z0-9]{2,3}$/i.test(cell.trim())) {
                console.log(`  Potential TADIG at row ${i + 1}, col ${colIndex + 1}: "${cell}"`);
              }
            });
          }
        }
        
        // Sample some data rows from the middle
        if (jsonData.length > 10) {
          console.log('\nSample middle rows:');
          const startRow = Math.floor(jsonData.length / 3);
          for (let i = startRow; i < Math.min(startRow + 3, jsonData.length); i++) {
            console.log(`Row ${i + 1}:`, jsonData[i]);
          }
        }
        
        // Show last few rows
        if (jsonData.length > 5) {
          console.log('\nLast 3 rows:');
          for (let i = Math.max(0, jsonData.length - 3); i < jsonData.length; i++) {
            console.log(`Row ${i + 1}:`, jsonData[i]);
          }
        }
      }
    });
    
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
  }
}

// Analyze each file
files.forEach(filename => {
  const filePath = path.join(__dirname, filename);
  analyzeExcelFile(filePath);
});

console.log(`\n${'='.repeat(80)}`);
console.log('ANALYSIS COMPLETE');
console.log(`${'='.repeat(80)}`);