/**
 * Script to find TADIGs in pricing databases that are missing from MNO names database
 */

const XLSX = require('xlsx');
const path = require('path');

// Load MNO names database
function loadMNOTadigs() {
  const filePath = path.join(__dirname, '..', 'MNO names.xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const tadigs = new Set();
  let multiTadigCount = 0;

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (row && row[2]) {
      const tadigCell = row[2].toString().trim();

      // Handle multiple TADIGs separated by comma
      if (tadigCell.includes(',')) {
        const tadigList = tadigCell.split(',').map(t => t.trim().toUpperCase());
        tadigList.forEach(t => {
          if (t) tadigs.add(t);
        });
        multiTadigCount++;
      } else {
        tadigs.add(tadigCell.toUpperCase());
      }
    }
  }

  console.log(`✅ Loaded ${tadigs.size} TADIGs from MNO names database`);
  console.log(`   (${multiTadigCount} networks with multiple TADIGs)\n`);
  return tadigs;
}

// Load A1 TADIGs
function loadA1Tadigs() {
  const filePath = path.join(__dirname, '..', '202509_Country Price List A1 IMSI Sponsoring.xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['prices A1 WS'];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const tadigs = new Map(); // TADIG -> {country, network}
  for (let i = 8; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (row && row[4]) {
      const tadig = row[4].toString().trim().toUpperCase();
      tadigs.set(tadig, {
        country: row[0]?.toString().trim() || '',
        network: row[1]?.toString().trim() || '',
        source: 'A1'
      });
    }
  }

  console.log(`📊 Loaded ${tadigs.size} TADIGs from A1 database`);
  return tadigs;
}

// Load Telefonica TADIGs
function loadTelefonicaTadigs() {
  const filePath = path.join(__dirname, '..', '20250205 Monogoto TGS UK V1.xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Format All'];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const tadigs = new Map();
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (row && row[2]) {
      const tadig = row[2].toString().trim().toUpperCase();
      tadigs.set(tadig, {
        country: row[0]?.toString().trim() || '',
        network: row[1]?.toString().trim() || '',
        source: 'Telefonica'
      });
    }
  }

  console.log(`📊 Loaded ${tadigs.size} TADIGs from Telefonica database`);
  return tadigs;
}

// Load Tele2 TADIGs
function loadTele2Tadigs() {
  const filePath = path.join(__dirname, '..', 'Tele2 data fee June-23 analysis.xlsx');
  const workbook = XLSX.readFile(filePath);

  // Try multiple possible sheet names
  const possibleSheets = ['Pricelist 2024-11-01', 'Cost DATA by customer', 'Sheet1'];
  let sheet = null;
  for (const sheetName of possibleSheets) {
    if (workbook.Sheets[sheetName]) {
      sheet = workbook.Sheets[sheetName];
      break;
    }
  }

  if (!sheet) {
    console.log('⚠️  Could not find Tele2 sheet');
    return new Map();
  }

  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const tadigs = new Map();
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (row && row[0]) {
      const tadig = row[0].toString().trim().toUpperCase();
      if (tadig.length === 5) { // Valid TADIG format
        tadigs.set(tadig, {
          country: row[2]?.toString().split(' - ')[1] || 'Unknown',
          network: row[2]?.toString().trim() || '',
          source: 'Tele2'
        });
      }
    }
  }

  console.log(`📊 Loaded ${tadigs.size} TADIGs from Tele2 database\n`);
  return tadigs;
}

// Main analysis
function analyzeMissingTadigs() {
  console.log('🔍 Analyzing TADIGs across databases...\n');

  const mnoTadigs = loadMNOTadigs();
  const a1Tadigs = loadA1Tadigs();
  const telefonicaTadigs = loadTelefonicaTadigs();
  const tele2Tadigs = loadTele2Tadigs();

  // Combine all pricing TADIGs
  const allPricingTadigs = new Map();

  // Merge all pricing sources
  for (const [tadig, info] of a1Tadigs) {
    if (!allPricingTadigs.has(tadig)) {
      allPricingTadigs.set(tadig, { ...info, sources: [info.source] });
    } else {
      allPricingTadigs.get(tadig).sources.push(info.source);
    }
  }

  for (const [tadig, info] of telefonicaTadigs) {
    if (!allPricingTadigs.has(tadig)) {
      allPricingTadigs.set(tadig, { ...info, sources: [info.source] });
    } else {
      allPricingTadigs.get(tadig).sources.push(info.source);
    }
  }

  for (const [tadig, info] of tele2Tadigs) {
    if (!allPricingTadigs.has(tadig)) {
      allPricingTadigs.set(tadig, { ...info, sources: [info.source] });
    } else {
      allPricingTadigs.get(tadig).sources.push(info.source);
    }
  }

  console.log(`\n📊 Total unique TADIGs in pricing databases: ${allPricingTadigs.size}`);

  // Find missing TADIGs
  const missingTadigs = [];
  for (const [tadig, info] of allPricingTadigs) {
    if (!mnoTadigs.has(tadig)) {
      missingTadigs.push({ tadig, ...info });
    }
  }

  console.log(`\n❌ TADIGs missing from MNO names database: ${missingTadigs.length}\n`);

  if (missingTadigs.length > 0) {
    console.log('=' .repeat(100));
    console.log('MISSING NETWORKS - These TADIGs exist in pricing files but NOT in MNO names database:');
    console.log('=' .repeat(100));
    console.log();

    // Sort by number of sources (most important first)
    missingTadigs.sort((a, b) => b.sources.length - a.sources.length);

    missingTadigs.forEach((item, index) => {
      const sourcesList = item.sources.join(', ');
      console.log(`${index + 1}. TADIG: ${item.tadig}`);
      console.log(`   Country: ${item.country}`);
      console.log(`   Network: ${item.network}`);
      console.log(`   Found in: ${sourcesList} (${item.sources.length} source${item.sources.length > 1 ? 's' : ''})`);
      console.log();
    });

    // Statistics by source
    console.log('=' .repeat(100));
    console.log('STATISTICS BY SOURCE:');
    console.log('=' .repeat(100));

    const a1Missing = missingTadigs.filter(t => t.sources.includes('A1')).length;
    const tfMissing = missingTadigs.filter(t => t.sources.includes('Telefonica')).length;
    const t2Missing = missingTadigs.filter(t => t.sources.includes('Tele2')).length;
    const multiSource = missingTadigs.filter(t => t.sources.length > 1).length;

    console.log(`\nA1 networks missing: ${a1Missing}`);
    console.log(`Telefonica networks missing: ${tfMissing}`);
    console.log(`Tele2 networks missing: ${t2Missing}`);
    console.log(`Networks missing from multiple sources: ${multiSource}`);

    // Export to CSV
    const csvLines = ['TADIG,Country,Network,Sources,SourceCount'];
    missingTadigs.forEach(item => {
      csvLines.push(`${item.tadig},"${item.country}","${item.network}","${item.sources.join(', ')}",${item.sources.length}`);
    });

    const fs = require('fs');
    const csvPath = path.join(__dirname, '..', 'missing-tadigs-report.csv');
    fs.writeFileSync(csvPath, csvLines.join('\n'));
    console.log(`\n✅ Report exported to: missing-tadigs-report.csv`);
  } else {
    console.log('✅ All TADIGs from pricing databases exist in MNO names database!');
  }

  // Coverage statistics
  const coverage = ((allPricingTadigs.size - missingTadigs.length) / allPricingTadigs.size * 100).toFixed(1);
  console.log(`\n📊 MNO Database Coverage: ${coverage}% (${allPricingTadigs.size - missingTadigs.length}/${allPricingTadigs.size} networks)`);
}

// Run analysis
analyzeMissingTadigs();
