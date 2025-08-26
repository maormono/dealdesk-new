import { ComprehensiveParser } from './services/comprehensiveParser.js';
async function testParser() {
    console.log('🧪 Testing Comprehensive Parser\n');
    console.log('='.repeat(60));
    const parser = new ComprehensiveParser();
    const allData = await parser.loadAllData();
    console.log('\n' + '='.repeat(60));
    console.log('📊 PARSING COMPLETE - Summary Statistics:\n');
    // Group by source
    const bySource = {
        A1: allData.filter(d => d.source === 'A1'),
        Telefonica: allData.filter(d => d.source === 'Telefonica'),
        Tele2: allData.filter(d => d.source === 'Tele2')
    };
    console.log('Records by Source:');
    console.log(`  A1:         ${bySource.A1.length} records`);
    console.log(`  Telefonica: ${bySource.Telefonica.length} records`);
    console.log(`  Tele2:      ${bySource.Tele2.length} records`);
    console.log(`  TOTAL:      ${allData.length} records`);
    // Unique TADIGs
    const uniqueTadigs = new Set(allData.map(d => d.tadig));
    console.log(`\nUnique TADIGs: ${uniqueTadigs.size}`);
    // Unique countries
    const uniqueCountries = new Set(allData.map(d => d.country));
    console.log(`Unique Countries: ${uniqueCountries.size}`);
    // Sample some data
    console.log('\n' + '='.repeat(60));
    console.log('📋 Sample Data (first 5 from each source):\n');
    console.log('A1 Samples:');
    bySource.A1.slice(0, 5).forEach(item => {
        console.log(`  ${item.tadig.padEnd(6)} | ${item.country.padEnd(20)} | ${item.network.padEnd(25)} | IMSI: €${item.imsiCost.toFixed(2)} | Data: €${item.dataPerMB.toFixed(4)}/MB`);
    });
    console.log('\nTelefonica Samples:');
    bySource.Telefonica.slice(0, 5).forEach(item => {
        console.log(`  ${item.tadig.padEnd(6)} | ${item.country.padEnd(20)} | ${item.network.padEnd(25)} | IMSI: $${item.imsiCost.toFixed(2)} | Data: $${item.dataPerMB.toFixed(4)}/MB`);
    });
    console.log('\nTele2 Samples:');
    bySource.Tele2.slice(0, 5).forEach(item => {
        console.log(`  ${item.tadig.padEnd(6)} | ${item.country.padEnd(20)} | ${item.network.padEnd(25)} | IMSI: $${item.imsiCost.toFixed(2)} | Data: $${item.dataPerMB.toFixed(4)}/MB`);
    });
    // Test search
    console.log('\n' + '='.repeat(60));
    console.log('🔍 Testing Search Functionality:\n');
    const searchTests = ['United States', 'T-Mobile', 'Vodafone', 'Germany'];
    searchTests.forEach(query => {
        const results = parser.searchNetworks(query);
        console.log(`Search "${query}": ${results.length} results`);
        if (results.length > 0 && results.length <= 5) {
            results.forEach(r => {
                console.log(`  - ${r.network} (${r.country}) - ${r.source}`);
            });
        }
        else if (results.length > 5) {
            const uniqueNetworks = new Set(results.map(r => `${r.network} (${r.country})`));
            console.log(`  Found ${uniqueNetworks.size} unique networks`);
        }
    });
    // Check for records with IMSI fees
    const withImsi = allData.filter(d => d.imsiCost > 0);
    console.log(`\n📱 Records with IMSI fees: ${withImsi.length}`);
    if (withImsi.length > 0) {
        console.log('Sample IMSI fees:');
        withImsi.slice(0, 5).forEach(item => {
            console.log(`  ${item.network.padEnd(25)} | ${item.currency}${item.imsiCost.toFixed(2)}`);
        });
    }
    // Check for restrictions
    const withRestrictions = allData.filter(d => d.restrictions && d.restrictions.length > 0);
    console.log(`\n⚠️ Records with restrictions: ${withRestrictions.length}`);
    if (withRestrictions.length > 0) {
        console.log('Sample restrictions:');
        withRestrictions.slice(0, 3).forEach(item => {
            console.log(`  ${item.network}: ${item.restrictions.substring(0, 50)}...`);
        });
    }
    console.log('\n' + '='.repeat(60));
    console.log('✅ Parser test complete!\n');
}
// Run the test
testParser().catch(console.error);
//# sourceMappingURL=testParser.js.map