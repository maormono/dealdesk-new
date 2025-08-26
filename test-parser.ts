import { ComprehensiveParser } from './backend/src/services/comprehensiveParser';

async function testParser() {
  console.log('Testing Comprehensive Parser...\n');
  
  const parser = new ComprehensiveParser();
  
  // Parse all three files
  const a1Data = await parser.parseA1File();
  const telefonicaData = await parser.parseTelefonicaFile();
  const tele2Data = await parser.parseTele2File();
  
  console.log('=== PARSING RESULTS ===');
  console.log(`A1: ${a1Data.length} networks parsed`);
  console.log(`Telefonica: ${telefonicaData.length} networks parsed`);
  console.log(`Tele2: ${tele2Data.length} networks parsed`);
  console.log(`Total: ${a1Data.length + telefonicaData.length + tele2Data.length} networks\n`);
  
  // Check for CANST specifically
  const canst = a1Data.find(n => n.tadig === 'CANST');
  if (canst) {
    console.log('✅ CANST FOUND! Details:');
    console.log(`  Country: ${canst.country}`);
    console.log(`  Network: ${canst.network}`);
    console.log(`  MCC/MNC: ${canst.mccMnc}`);
    console.log('  Technologies:');
    console.log(`    GSM: ${canst.gsm}`);
    console.log(`    2G GPRS: ${canst.gprs2G}`);
    console.log(`    3G UMTS: ${canst.umts3G}`);
    console.log(`    4G LTE: ${canst.lte4G}`);
    console.log(`    5G: ${canst.lte5G}`);
    console.log(`  Pricing:`);
    console.log(`    Data per MB: ${canst.dataPerMB} ${canst.currency}`);
    console.log(`    SMS Out: ${canst.smsOutgoing}`);
    console.log(`    Voice Out: ${canst.voiceOutgoing}`);
  } else {
    console.log('❌ CANST NOT FOUND in parsed data');
  }
  
  // Check other networks with "in process" status
  console.log('\n=== TECHNOLOGY COVERAGE ===');
  
  // A1 networks with any active technology
  const a1WithTech = a1Data.filter(n => 
    n.gsm || n.gprs2G || n.umts3G || n.lte4G || n.lte5G || n.lteM || n.nbIot
  );
  console.log(`A1 networks with active technologies: ${a1WithTech.length}/${a1Data.length}`);
  
  // Telefonica networks with any active technology
  const telWithTech = telefonicaData.filter(n => 
    n.gsm || n.gprs2G || n.umts3G || n.lte4G || n.lte5G || n.lteM || n.nbIot
  );
  console.log(`Telefonica networks with active technologies: ${telWithTech.length}/${telefonicaData.length}`);
  
  // Sample some networks to verify parsing
  console.log('\n=== SAMPLE NETWORKS ===');
  const samples = [...a1Data.slice(0, 2), ...telefonicaData.slice(0, 2), ...tele2Data.slice(0, 2)];
  samples.forEach(net => {
    console.log(`${net.tadig} (${net.source}): ${net.country} - ${net.network}`);
    if (net.source !== 'Tele2') {
      const techs = [];
      if (net.gsm) techs.push('GSM');
      if (net.gprs2G) techs.push('2G');
      if (net.umts3G) techs.push('3G');
      if (net.lte4G) techs.push('4G');
      if (net.lte5G) techs.push('5G');
      console.log(`  Tech: ${techs.join(', ') || 'None'}`);
    }
  });
}

testParser().catch(console.error);