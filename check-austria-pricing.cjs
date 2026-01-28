const XLSX = require('xlsx');

// Read the Excel file
const workbook = XLSX.readFile('./network-pricing-2025-12-30.xlsx');
const sheet = workbook.Sheets['Network Pricing'];

if (!sheet) {
  console.error('❌ Sheet "Network Pricing" not found');
  process.exit(1);
}

const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

function parsePrice(value) {
  if (!value) return null;
  const str = String(value).replace(/[$€£,]/g, '').trim();
  if (str === '-' || str === '') return null;
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

let currentCountry = '';
let currentNetwork = '';
let currentTadig = '';

console.log('\n🇦🇹 AUSTRIA NETWORK PRICING ANALYSIS\n');
console.log('Country | Network | TADIG | Identity | Data/MB | IMSI Cost | SMS Cost | Total for 10MB');
console.log('-'.repeat(100));

// Skip header row, start from row 2 (index 1)
for (let i = 1; i < rawData.length; i++) {
  const row = rawData[i];
  if (!row || row.length === 0) continue;

  // Update current values if present
  if (row[0] && String(row[0]).trim()) {
    currentCountry = String(row[0]).trim();
  }
  if (row[1] && String(row[1]).trim()) {
    currentNetwork = String(row[1]).trim();
  }
  if (row[2] && String(row[2]).trim()) {
    currentTadig = String(row[2]).trim();
  }

  const identity = row[3] ? String(row[3]).trim() : '';
  if (!identity) continue;

  // Only show Austria
  if (currentCountry === 'Austria') {
    const dataPerMB = parsePrice(row[4]);
    const smsCost = parsePrice(row[5]);
    const imsiCost = parsePrice(row[6]);
    const totalFor10MB = (dataPerMB || 0) * 10 + (imsiCost || 0);

    console.log(
      `${currentCountry.padEnd(8)} | ${currentNetwork.padEnd(7)} | ${currentTadig.padEnd(6)} | ${identity.padEnd(8)} | $${(dataPerMB || 0).toFixed(4).padStart(7)} | $${(imsiCost || 0).toFixed(4).padStart(9)} | $${(smsCost || 0).toFixed(4).padStart(8)} | $${totalFor10MB.toFixed(4)}`
    );
  }
}

console.log('\n');
