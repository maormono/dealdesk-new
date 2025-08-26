#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('📊 DealDesk Excel File Analysis');
console.log('=' .repeat(60));

// Check file sizes and existence
const files = [
  '202509_Country Price List A1 IMSI Sponsoring.xlsx',
  '20250205 Monogoto TGS UK V1.xlsx',
  'Tele2 data fee June-23 analysis.xlsx'
];

console.log('\n📁 File Information:\n');

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`✅ ${file}`);
    console.log(`   Size: ${sizeMB} MB`);
    
    // Estimate rows based on file size (rough approximation)
    const estimatedRows = Math.round(stats.size / 1000); // Very rough estimate
    console.log(`   Estimated rows: ~${estimatedRows}`);
  } else {
    console.log(`❌ ${file} - NOT FOUND`);
  }
  console.log('');
});

console.log('=' .repeat(60));
console.log('\n📌 Expected Data Structure:\n');

console.log('A1 File (202509_Country Price List A1 IMSI Sponsoring.xlsx):');
console.log('  - Sheet: "prices A1 WS"');
console.log('  - Expected rows: ~470+');
console.log('  - Key columns: Country, Network, TADIG, IMSI fee, Data price/MB');
console.log('  - Currency: EUR');
console.log('  - Special: Includes restrictions, technology status, closure dates\n');

console.log('Telefonica File (20250205 Monogoto TGS UK V1.xlsx):');
console.log('  - Sheet: "Format All"');
console.log('  - Expected rows: ~520+');
console.log('  - Key columns: Country, Operator, Tadig, Data, SMS, Voice');
console.log('  - Currency: USD');
console.log('  - Special: Technology availability status\n');

console.log('Tele2 File (Tele2 data fee June-23 analysis.xlsx):');
console.log('  - Multiple sheets: Monthly data + "Cost DATA by customer"');
console.log('  - Expected rows: ~1600+ (across sheets)');
console.log('  - Key columns: TADIG, Network name, Cost per MB');
console.log('  - Currency: USD');
console.log('  - Special: Real customer usage data\n');

console.log('=' .repeat(60));
console.log('\n⚡ To properly parse these files, we need:');
console.log('  1. xlsx package installed (npm install xlsx)');
console.log('  2. Proper column mapping for each format');
console.log('  3. TADIG to formal network name mapping');
console.log('  4. Currency conversion for comparison');
console.log('  5. Handling of special instructions and restrictions\n');

console.log('🔧 Next Steps:');
console.log('  1. Install dependencies: npm install xlsx');
console.log('  2. Run the comprehensive parser');
console.log('  3. Load all data into the application\n');

// Try to load XLSX if available
try {
  const XLSX = require('xlsx');
  console.log('✅ XLSX module found - attempting to parse files...\n');
  
  // Parse A1 file
  const a1Path = path.join(__dirname, files[0]);
  if (fs.existsSync(a1Path)) {
    const workbook = XLSX.readFile(a1Path);
    const sheet = workbook.Sheets['prices A1 WS'];
    if (sheet) {
      const range = XLSX.utils.decode_range(sheet['!ref']);
      console.log(`A1 File: ${range.e.r + 1} rows x ${range.e.c + 1} columns`);
    }
  }
  
  // Parse Telefonica file
  const telPath = path.join(__dirname, files[1]);
  if (fs.existsSync(telPath)) {
    const workbook = XLSX.readFile(telPath);
    const sheet = workbook.Sheets['Format All'];
    if (sheet) {
      const range = XLSX.utils.decode_range(sheet['!ref']);
      console.log(`Telefonica File: ${range.e.r + 1} rows x ${range.e.c + 1} columns`);
    }
  }
  
  // Parse Tele2 file
  const tele2Path = path.join(__dirname, files[2]);
  if (fs.existsSync(tele2Path)) {
    const workbook = XLSX.readFile(tele2Path);
    console.log(`Tele2 File sheets: ${workbook.SheetNames.join(', ')}`);
    workbook.SheetNames.forEach(name => {
      const sheet = workbook.Sheets[name];
      if (sheet && sheet['!ref']) {
        const range = XLSX.utils.decode_range(sheet['!ref']);
        console.log(`  Sheet "${name}": ${range.e.r + 1} rows`);
      }
    });
  }
  
} catch (error) {
  console.log('⚠️ XLSX module not available. Install with: npm install xlsx');
  console.log('   Error:', error.message);
}