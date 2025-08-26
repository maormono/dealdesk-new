#!/usr/bin/env node

/**
 * Import network data using the FIXED comprehensive parser
 * This ensures all data quality fixes are applied
 */

import { createClient } from '@supabase/supabase-js';
import { ComprehensiveParser } from './backend/src/services/comprehensiveParser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, 'frontend', '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://uddmjjgnexdazfedrytt.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function clearDatabase() {
  console.log('🗑️  Clearing existing data...');
  
  // Delete pricing first due to foreign keys
  const { error: pricingError } = await supabase
    .from('network_pricing')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (pricingError) {
    console.error('Error clearing pricing:', pricingError);
  }
  
  // Delete networks
  const { error: networkError } = await supabase
    .from('networks')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (networkError) {
    console.error('Error clearing networks:', networkError);
  }
  
  // Delete sources
  const { error: sourceError } = await supabase
    .from('pricing_sources')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (sourceError) {
    console.error('Error clearing sources:', sourceError);
  }
  
  console.log('✅ Database cleared');
}

async function importData() {
  console.log('📂 Parsing Excel files with fixed parser...\n');
  
  const parser = new ComprehensiveParser();
  
  // Parse all three files
  const a1Data = await parser.parseA1File();
  const telefonicaData = await parser.parseTelefonicaFile();
  const tele2Data = await parser.parseTele2File();
  
  console.log(`Parsed: A1=${a1Data.length}, Telefonica=${telefonicaData.length}, Tele2=${tele2Data.length}`);
  
  const allData = [...a1Data, ...telefonicaData, ...tele2Data];
  
  // Create sources
  console.log('\n📝 Creating pricing sources...');
  const sources = {
    'A1': null,
    'Telefonica': null,
    'Tele2': null
  };
  
  for (const sourceName of Object.keys(sources)) {
    const { data, error } = await supabase
      .from('pricing_sources')
      .insert({
        source_name: sourceName,
        is_active: true
      })
      .select('id')
      .single();
    
    if (error) {
      console.error(`Error creating source ${sourceName}:`, error);
    } else {
      sources[sourceName] = data.id;
      console.log(`  ✅ Created source: ${sourceName}`);
    }
  }
  
  // Group networks by TADIG
  const networksByTadig = new Map();
  
  allData.forEach(network => {
    if (!network.tadig) return;
    
    if (!networksByTadig.has(network.tadig)) {
      networksByTadig.set(network.tadig, {
        tadig: network.tadig,
        country: network.country,
        network: network.network,
        mccMnc: network.mccMnc,
        pricing: []
      });
    }
    
    // Add pricing from this source
    networksByTadig.get(network.tadig).pricing.push({
      source: network.source,
      sourceId: sources[network.source],
      dataPerMB: network.dataPerMB || 0,
      imsiCost: network.imsiCost || 0,
      smsOutgoing: network.smsOutgoing || 0,
      smsIncoming: network.smsIncoming || 0,
      voiceOutgoing: network.voiceOutgoing || 0,
      voiceIncoming: network.voiceIncoming || 0,
      currency: network.currency || 'USD',
      lte4G: network.lte4G || false,
      lte5G: network.lte5G || false,
      lteM: network.lteM || false,
      nbIot: network.nbIot || false,
      restrictions: network.restrictions
    });
  });
  
  console.log(`\n🌐 Importing ${networksByTadig.size} unique networks...`);
  
  let imported = 0;
  let failed = 0;
  
  for (const [tadig, networkData] of networksByTadig) {
    // Check specific networks we care about
    if (tadig === 'CANST') {
      console.log(`\n🇨🇦 Processing CANST (SaskTel):`);
      console.log(`  Country: ${networkData.country}`);
      console.log(`  Network: ${networkData.network}`);
      console.log(`  Pricing sources: ${networkData.pricing.map(p => p.source).join(', ')}`);
    }
    
    // Insert network
    const { data: networkRecord, error: networkError } = await supabase
      .from('networks')
      .insert({
        network_name: networkData.network,
        country: networkData.country,
        tadig: networkData.tadig,
        mcc_mnc: networkData.mccMnc,
        is_active: true
      })
      .select('id')
      .single();
    
    if (networkError) {
      console.error(`Failed to insert network ${tadig}:`, networkError.message);
      failed++;
      continue;
    }
    
    // Insert pricing for each source
    for (const pricing of networkData.pricing) {
      if (!pricing.sourceId) continue;
      
      const { error: pricingError } = await supabase
        .from('network_pricing')
        .insert({
          network_id: networkRecord.id,
          source_id: pricing.sourceId,
          data_per_mb: pricing.dataPerMB,
          imsi_access_fee: pricing.imsiCost,
          sms_mo: pricing.smsOutgoing,
          sms_mt: pricing.smsIncoming,
          voice_moc: pricing.voiceOutgoing,
          voice_mtc: pricing.voiceIncoming,
          currency: pricing.currency,
          lte_4g: pricing.lte4G,
          lte_5g: pricing.lte5G,
          lte_m: pricing.lteM,
          nb_iot: pricing.nbIot,
          restrictions: pricing.restrictions,
          is_active: true
        });
      
      if (pricingError) {
        console.error(`Failed to insert pricing for ${tadig}/${pricing.source}:`, pricingError.message);
      }
    }
    
    imported++;
    
    // Progress indicator
    if (imported % 50 === 0) {
      console.log(`  Progress: ${imported}/${networksByTadig.size} networks imported`);
    }
  }
  
  console.log(`\n✅ Import complete!`);
  console.log(`  Successfully imported: ${imported} networks`);
  console.log(`  Failed: ${failed} networks`);
  
  // Verify CANST
  console.log('\n🔍 Verifying CANST import...');
  const { data: canstCheck, error: canstError } = await supabase
    .from('networks')
    .select('*')
    .eq('tadig', 'CANST')
    .single();
  
  if (canstError) {
    console.error('❌ CANST not found in database:', canstError);
  } else {
    console.log('✅ CANST verified in database:');
    console.log(`  ID: ${canstCheck.id}`);
    console.log(`  Country: ${canstCheck.country}`);
    console.log(`  Network: ${canstCheck.network_name}`);
  }
}

async function main() {
  try {
    console.log('🚀 Starting import with FIXED parser...\n');
    
    // Clear existing data
    await clearDatabase();
    
    // Import new data
    await importData();
    
    console.log('\n🎉 Import process completed!');
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

main();