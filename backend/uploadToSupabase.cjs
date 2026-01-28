const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://kjdicpntoevtxqblsion.supabase.co';
// Use service role key for admin operations
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZGljcG50b2V2dHhxYmxzaW9uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTExNjQ5MywiZXhwIjoyMDUwNjkyNDkzfQ.Ej1GGvYeZG9c-KHJo8HBrR0eG7Kv1P_hIJwRVnIRVPw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper functions
function parsePrice(value) {
  if (!value) return null;
  const str = String(value).replace(/[$€£,]/g, '').trim();
  if (str === '-' || str === '') return null;
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function hasCheckmark(value) {
  if (!value) return false;
  const str = String(value).trim();
  return str.includes('✓') || str === 'Y' || str === 'Yes' || str === '1' || str.toLowerCase() === 'true';
}

function hasDoubleCheckmark(value) {
  if (!value) return false;
  const str = String(value).trim();
  return str.includes('✓✓');
}

async function uploadData() {
  console.log('📂 Loading network pricing from Excel...');

  // Read the Excel file
  const workbook = XLSX.readFile('../network-pricing-2025-12-30.xlsx');
  const sheet = workbook.Sheets['Network Pricing'];

  if (!sheet) {
    console.error('❌ Sheet "Network Pricing" not found');
    return;
  }

  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const records = [];

  let currentCountry = '';
  let currentNetwork = '';
  let currentTadig = '';

  // Skip header row, start from row 2 (index 1)
  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0) continue;

    // Update current values if present (non-empty)
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

    // Skip if no identity (invalid row)
    if (!identity) continue;

    records.push({
      country: currentCountry,
      network_name: currentNetwork,
      tadig: currentTadig,
      identity: identity,
      data_per_mb: parsePrice(row[4]),
      sms_cost: parsePrice(row[5]),
      imsi_cost: parsePrice(row[6]),
      gsm: hasCheckmark(row[7]),
      gprs_2g: hasCheckmark(row[7]),
      umts_3g: hasCheckmark(row[8]),
      lte_4g: hasCheckmark(row[9]),
      lte_5g: hasCheckmark(row[10]),
      lte_m: hasCheckmark(row[11]),
      lte_m_double: hasDoubleCheckmark(row[11]),
      nb_iot: hasCheckmark(row[12]),
      nb_iot_double: hasDoubleCheckmark(row[12]),
      notes: row[13] ? String(row[13]).trim() : ''
    });
  }

  console.log(`📊 Parsed ${records.length} records from Excel`);

  // Check for US data
  const usRecords = records.filter(r => r.country === 'United States');
  console.log(`🇺🇸 Found ${usRecords.length} US records`);
  if (usRecords.length > 0) {
    console.log('US Networks:', usRecords.map(r => `${r.network_name} (${r.tadig}, ${r.identity})`));
  }

  // Clear existing data
  console.log('🗑️ Clearing existing data...');
  const { error: deleteError } = await supabase
    .from('network_pricing')
    .delete()
    .gte('id', 0);

  if (deleteError) {
    console.error('❌ Failed to delete existing data:', deleteError.message);
    return;
  }

  // Insert in batches of 100
  console.log('📤 Uploading to Supabase...');
  const batchSize = 100;
  let uploaded = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error: insertError } = await supabase
      .from('network_pricing')
      .insert(batch);

    if (insertError) {
      console.error(`❌ Failed to insert batch at ${i}:`, insertError.message);
      return;
    }

    uploaded += batch.length;
    console.log(`  Progress: ${uploaded}/${records.length}`);
  }

  console.log('✅ Upload complete!');
  console.log(`📊 Total records uploaded: ${records.length}`);

  // Verify US data
  const { data: verifyData, error: verifyError } = await supabase
    .from('network_pricing')
    .select('country, network_name, tadig, identity')
    .eq('country', 'United States');

  if (verifyError) {
    console.error('❌ Verification failed:', verifyError.message);
  } else {
    console.log(`\n🔍 Verification - US records in Supabase: ${verifyData.length}`);
    verifyData.forEach(r => console.log(`  - ${r.network_name} (${r.tadig}, ${r.identity})`));
  }
}

uploadData().catch(console.error);
