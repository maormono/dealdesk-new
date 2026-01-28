const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://kjdicpntoevtxqblsion.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZGljcG50b2V2dHhxYmxzaW9uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTExNjQ5MywiZXhwIjoyMDUwNjkyNDkzfQ.Ej1GGvYeZG9c-KHJo8HBrR0eG7Kv1P_hIJwRVnIRVPw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function queryAustria() {
  console.log('\n🇦🇹 AUSTRIA NETWORK PRICING FROM DATABASE\n');

  const { data, error } = await supabase
    .from('network_pricing')
    .select('*')
    .eq('country', 'Austria')
    .order('network_name', { ascending: true })
    .order('identity', { ascending: true });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No data found for Austria');
    return;
  }

  console.log(`Found ${data.length} pricing entries for Austria\n`);
  console.log('Network | Identity | Data/MB | IMSI Cost | SMS Cost | Total for 10MB');
  console.log('-'.repeat(90));

  data.forEach(row => {
    const dataPerMB = row.data_per_mb || 0;
    const imsiCost = row.imsi_cost || 0;
    const smsCost = row.sms_cost || 0;
    const totalFor10MB = (dataPerMB * 10) + imsiCost;

    console.log(
      `${(row.network_name || 'Unknown').padEnd(24)} | ${(row.identity || '?').padEnd(8)} | $${dataPerMB.toFixed(6).padStart(8)} | $${imsiCost.toFixed(4).padStart(9)} | $${smsCost.toFixed(4).padStart(8)} | $${totalFor10MB.toFixed(6)}`
    );
  });

  console.log('\n');
  console.log('📊 SORTED BY TOTAL COST FOR 10MB:');
  console.log('-'.repeat(90));

  const sorted = [...data].sort((a, b) => {
    const costA = ((a.data_per_mb || 0) * 10) + (a.imsi_cost || 0);
    const costB = ((b.data_per_mb || 0) * 10) + (b.imsi_cost || 0);
    return costA - costB;
  });

  sorted.forEach((row, idx) => {
    const dataPerMB = row.data_per_mb || 0;
    const imsiCost = row.imsi_cost || 0;
    const totalFor10MB = (dataPerMB * 10) + imsiCost;

    console.log(
      `${(idx + 1).toString().padStart(2)}. ${(row.network_name || 'Unknown').padEnd(24)} (${row.identity || '?'}) - Total: $${totalFor10MB.toFixed(6)} = ($${dataPerMB.toFixed(6)}/MB × 10) + $${imsiCost.toFixed(4)} IMSI`
    );
  });

  console.log('\n');
}

queryAustria().catch(console.error);
