import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test TADIGs validation
function isValidTadig(tadig) {
  if (!tadig || tadig.length !== 5) return false;
  
  const invalidTadigs = ['11111', '22222', '33333', '44444'];
  if (invalidTadigs.includes(tadig)) return false;
  
  // Rule 1: TADIG cannot be all digits (must contain at least one letter)
  if (/^[0-9]{5}$/.test(tadig)) return false;
  
  // Must be alphanumeric (letters and numbers only)
  return /^[A-Z0-9]{5}$/i.test(tadig);
}

// Normalize country names
function normalizeCountryName(country) {
  return country.trim();
}

// Get formal network name
function getFormalNetworkName(tadig, operatorName) {
  return operatorName.trim();
}

async function testTele2Parser() {
  console.log('📂 Testing Tele2 parser against actual Excel file...\n');
  
  const filePath = path.join(__dirname, '0- Invoice Monogoto 2025-04.xlsx');
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ Tele2 file not found:', filePath);
    return;
  }

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Pricelist 2024-11-01'];
  
  if (!sheet) {
    console.error('❌ Pricelist 2024-11-01 sheet not found');
    return;
  }
  
  console.log('✅ Using sheet: Pricelist 2024-11-01');
  
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const rawNetworks = [];
  
  let totalRows = jsonData.length - 1; // Exclude header
  const filterStats = { invalidTadig: 0, noData: 0, dataNotLaunched: 0, prohibited: 0 };
  
  console.log(`📊 Starting analysis of ${totalRows} total rows...\n`);
  
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || !row[3] || row[3] === '') continue;
    
    const tadig = (row[3] || '').toString().trim();
    const comments = (row[11] || '').toString().toLowerCase().trim();
    const dataPerMB = parseFloat(row[8]) || 0;
    
    // Rule 1: Skip invalid TADIGs
    if (!isValidTadig(tadig)) {
      filterStats.invalidTadig++;
      continue;
    }
    
    // Rule 2: Skip networks with no data pricing
    if (dataPerMB <= 0) {
      filterStats.noData++;
      continue;
    }
    
    // Rule 3: Skip "data not launched"
    if (comments.includes('data not launched') || comments.includes("data don't launch")) {
      filterStats.dataNotLaunched++;
      continue;
    }
    
    // Rule 4: Skip "prohibited network"
    if (comments.includes('prohibited network')) {
      filterStats.prohibited++;
      continue;
    }
    
    // Network passed all filters
    const country = normalizeCountryName((row[1] || '').toString().trim());
    const networkRaw = (row[2] || '').toString().trim();
    const network = getFormalNetworkName(tadig, networkRaw);
    const smsOutgoing = parseFloat(row[7]) || 0;
    const imsiCost = parseFloat(row[10]) || 0;
    
    rawNetworks.push({
      tadig,
      country,
      network,
      imsiCost,
      dataPerMB,
      smsOutgoing,
      currency: 'EUR',
      source: 'Tele2',
      restrictions: comments
    });
  }
  
  console.log('📊 Filter statistics:');
  console.log(`   Invalid TADIGs filtered: ${filterStats.invalidTadig}`);
  console.log(`   No data pricing filtered: ${filterStats.noData}`);
  console.log(`   Data not launched filtered: ${filterStats.dataNotLaunched}`);
  console.log(`   Prohibited networks filtered: ${filterStats.prohibited}`);
  console.log(`   Networks passed filters: ${rawNetworks.length}`);
  
  // Rule 5: Consolidate networks by country + network name
  const consolidated = new Map();
  
  rawNetworks.forEach(network => {
    const key = `${network.country}|${network.network}`;
    
    if (consolidated.has(key)) {
      const existing = consolidated.get(key);
      existing.tadig = `${existing.tadig}, ${network.tadig}`;
    } else {
      consolidated.set(key, { ...network });
    }
  });
  
  const finalNetworks = Array.from(consolidated.values());
  
  // Check how many are up to €1.0/MB (for regular users)
  const affordableNetworks = finalNetworks.filter(n => n.dataPerMB <= 1.0);
  
  console.log(`\n✅ FINAL RESULTS:`);
  console.log(`   Admin users (all networks): ${finalNetworks.length}`);
  console.log(`   Regular users (≤€1.0/MB): ${affordableNetworks.length}`);
  console.log(`   Reduction from consolidation: ${rawNetworks.length - finalNetworks.length} networks merged`);
  
  // Show affordable networks for regular users
  console.log(`\n💰 Networks ≤€1.0/MB (visible to regular users):`);
  affordableNetworks.slice(0, 10).forEach(network => {
    console.log(`   ${network.tadig}: ${network.network} (${network.country}) - €${network.dataPerMB}/MB`);
  });
  
  return { admin: finalNetworks.length, regular: affordableNetworks.length };
}

testTele2Parser().catch(console.error);