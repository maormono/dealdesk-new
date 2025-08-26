import { ComprehensiveParser } from './backend/src/services/comprehensiveParser';

async function validateParsing() {
  console.log('🔍 Validating Parser Output...\n');
  
  const parser = new ComprehensiveParser();
  
  // Parse all three files
  const a1Data = await parser.parseA1File();
  const telefonicaData = await parser.parseTelefonicaFile();
  const tele2Data = await parser.parseTele2File();
  
  const allData = [...a1Data, ...telefonicaData, ...tele2Data];
  
  console.log('=== PARSING SUMMARY ===');
  console.log(`Total networks: ${allData.length}`);
  console.log(`  A1: ${a1Data.length}`);
  console.log(`  Telefonica: ${telefonicaData.length}`);
  console.log(`  Tele2: ${tele2Data.length}\n`);
  
  // Check for "Unknown" countries
  console.log('=== CHECKING FOR UNKNOWN COUNTRIES ===');
  const unknownCountries = allData.filter(n => 
    !n.country || 
    n.country === '' || 
    n.country.toLowerCase() === 'unknown' ||
    n.country === 'Unknown'
  );
  
  if (unknownCountries.length > 0) {
    console.log(`❌ Found ${unknownCountries.length} networks with unknown/empty countries:`);
    unknownCountries.forEach(n => {
      console.log(`  ${n.tadig} (${n.source}): country="${n.country}", network="${n.network}"`);
    });
  } else {
    console.log('✅ No networks with unknown countries');
  }
  
  // Check for networks where country might be in network field
  console.log('\n=== CHECKING FOR SWAPPED COUNTRY/NETWORK ===');
  const possiblySwapped = allData.filter(n => {
    // Check if network name looks like a country
    const countryNames = ['Canada', 'United States', 'Mexico', 'Germany', 'France', 'Spain', 'Italy', 'United Kingdom', 'Japan', 'China', 'Australia'];
    return countryNames.some(country => 
      n.network === country || 
      (n.network && n.network.startsWith(country + ' '))
    );
  });
  
  if (possiblySwapped.length > 0) {
    console.log(`⚠️  Found ${possiblySwapped.length} networks where network field might contain country:`);
    possiblySwapped.slice(0, 10).forEach(n => {
      console.log(`  ${n.tadig}: country="${n.country}", network="${n.network}"`);
    });
  }
  
  // Check for empty network names
  console.log('\n=== CHECKING FOR EMPTY NETWORK NAMES ===');
  const emptyNetworks = allData.filter(n => !n.network || n.network === '');
  
  if (emptyNetworks.length > 0) {
    console.log(`❌ Found ${emptyNetworks.length} networks with empty names:`);
    emptyNetworks.slice(0, 10).forEach(n => {
      console.log(`  ${n.tadig} (${n.source}): country="${n.country}"`);
    });
  } else {
    console.log('✅ All networks have names');
  }
  
  // Check network name cleaning results
  console.log('\n=== SAMPLE NETWORK NAMES (Check Cleaning) ===');
  const sampleNetworks = [
    ...a1Data.slice(0, 5),
    ...telefonicaData.slice(0, 5),
    ...tele2Data.slice(0, 5)
  ];
  
  console.log('First 5 from each source:');
  sampleNetworks.forEach(n => {
    console.log(`  [${n.source}] ${n.tadig}: "${n.network}" (${n.country})`);
  });
  
  // Check specific known networks
  console.log('\n=== SPECIFIC NETWORK CHECKS ===');
  const checkNetworks = [
    { tadig: 'CANST', expectedCountry: 'Canada', expectedNetwork: 'SaskTel' },
    { tadig: 'USAVZ', expectedCountry: 'United States', expectedNetwork: 'Verizon' },
    { tadig: 'DEUD2', expectedCountry: 'Germany', expectedNetwork: 'Vodafone' },
    { tadig: 'GBRCN', expectedCountry: 'United Kingdom', expectedNetwork: 'O2' }
  ];
  
  checkNetworks.forEach(check => {
    const network = allData.find(n => n.tadig === check.tadig);
    if (network) {
      const countryOk = network.country.includes(check.expectedCountry);
      const networkOk = network.network.includes(check.expectedNetwork);
      
      if (countryOk && networkOk) {
        console.log(`✅ ${check.tadig}: "${network.network}" (${network.country})`);
      } else {
        console.log(`❌ ${check.tadig}: "${network.network}" (${network.country})`);
        console.log(`   Expected country to include "${check.expectedCountry}" and network to include "${check.expectedNetwork}"`);
      }
    } else {
      console.log(`⚠️  ${check.tadig}: Not found in data`);
    }
  });
  
  // Check for duplicate TADIGs
  console.log('\n=== CHECKING FOR DUPLICATE TADIGS ===');
  const tadigCounts = new Map<string, number>();
  const tadigSources = new Map<string, string[]>();
  
  allData.forEach(n => {
    if (n.tadig) {
      tadigCounts.set(n.tadig, (tadigCounts.get(n.tadig) || 0) + 1);
      const sources = tadigSources.get(n.tadig) || [];
      sources.push(n.source);
      tadigSources.set(n.tadig, sources);
    }
  });
  
  const duplicates = Array.from(tadigCounts.entries())
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);
  
  if (duplicates.length > 0) {
    console.log(`Found ${duplicates.length} duplicate TADIGs:`);
    duplicates.slice(0, 10).forEach(([tadig, count]) => {
      const sources = tadigSources.get(tadig);
      console.log(`  ${tadig}: ${count} times (sources: ${sources?.join(', ')})`);
    });
  } else {
    console.log('✅ No duplicate TADIGs found');
  }
  
  // Final statistics
  console.log('\n=== FINAL STATISTICS ===');
  const countries = new Set(allData.map(n => n.country).filter(c => c && c !== 'Unknown'));
  console.log(`Unique countries: ${countries.size}`);
  console.log(`Networks with pricing data: ${allData.filter(n => n.dataPerMB > 0).length}`);
  console.log(`Networks with IMSI fees: ${allData.filter(n => n.imsiCost > 0).length}`);
  console.log(`Networks with 5G: ${allData.filter(n => n.lte5G).length}`);
  console.log(`Networks with IoT: ${allData.filter(n => n.nbIot || n.lteM).length}`);
}

validateParsing().catch(console.error);