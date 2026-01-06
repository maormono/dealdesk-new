const XLSX = require('xlsx');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uddmjjgnexdazfedrytt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_KEY not set');
  console.error('Run: export SUPABASE_SERVICE_KEY="your-service-role-key"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse price string like "$0.108" to number
function parsePrice(value) {
  if (!value || value === '-' || value === '') return 0;
  const strValue = String(value).trim();
  const numericStr = strValue.replace(/[^0-9.\-]/g, '');
  const parsed = parseFloat(numericStr);
  return isNaN(parsed) ? 0 : parsed;
}

// Check for checkmark
function hasCheckmark(value) {
  if (!value) return false;
  const strValue = String(value).trim();
  return strValue.includes('✓') || strValue.includes('✔') || strValue.toLowerCase() === 'yes' || strValue === '1';
}

// Check for double checkmark
function hasDoubleCheckmark(value) {
  if (!value) return false;
  const strValue = String(value).trim();
  return strValue.includes('✓✓') || strValue.includes('✔✔') || strValue === '2';
}

async function main() {
  const filePath = path.join(process.cwd(), 'network-pricing-2025-12-30.xlsx');
  console.log('📂 Reading:', filePath);

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Network Pricing'];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const records = [];
  let currentCountry = '';
  let currentNetwork = '';
  let currentTadig = '';

  // Skip header row
  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0) continue;

    // Update current values if present
    if (row[0] && String(row[0]).trim()) currentCountry = String(row[0]).trim();
    if (row[1] && String(row[1]).trim()) currentNetwork = String(row[1]).trim();
    if (row[2] && String(row[2]).trim()) currentTadig = String(row[2]).trim();

    const identity = row[3] ? String(row[3]).trim() : '';
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

  console.log('✅ Parsed ' + records.length + ' records');
  console.log('Sample record:', records[0]);

  // Upload to Supabase
  console.log('\n📊 Uploading to Supabase...');

  // First, delete existing data
  const { error: deleteError } = await supabase
    .from('network_pricing_v2')
    .delete()
    .gte('id', 0);

  if (deleteError) {
    if (deleteError.message.includes('does not exist')) {
      console.log('\n⚠️ Table does not exist. Create it in Supabase SQL Editor with:');
      console.log(`
CREATE TABLE network_pricing_v2 (
  id SERIAL PRIMARY KEY,
  country TEXT NOT NULL,
  network_name TEXT NOT NULL,
  tadig TEXT NOT NULL,
  identity TEXT NOT NULL,
  data_per_mb DECIMAL(10,6) DEFAULT 0,
  sms_cost DECIMAL(10,4) DEFAULT 0,
  imsi_cost DECIMAL(10,4) DEFAULT 0,
  gsm BOOLEAN DEFAULT FALSE,
  gprs_2g BOOLEAN DEFAULT FALSE,
  umts_3g BOOLEAN DEFAULT FALSE,
  lte_4g BOOLEAN DEFAULT FALSE,
  lte_5g BOOLEAN DEFAULT FALSE,
  lte_m BOOLEAN DEFAULT FALSE,
  lte_m_double BOOLEAN DEFAULT FALSE,
  nb_iot BOOLEAN DEFAULT FALSE,
  nb_iot_double BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE network_pricing_v2 ENABLE ROW LEVEL SECURITY;

-- Allow read for all authenticated users
CREATE POLICY "Allow read access" ON network_pricing_v2 FOR SELECT USING (true);
`);
      process.exit(1);
    }
    console.error('Delete error:', deleteError);
  }

  // Insert in batches of 100
  const batchSize = 100;
  let uploaded = 0;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase
      .from('network_pricing_v2')
      .insert(batch);

    if (error) {
      console.error('❌ Error at batch ' + i + ':', error.message);
      process.exit(1);
    }
    uploaded = i + batch.length;
    console.log('  Uploaded ' + uploaded + '/' + records.length);
  }

  console.log('\n✅ Upload complete! ' + records.length + ' records uploaded.');
}

main().catch(console.error);
