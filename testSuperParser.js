const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Simplified JavaScript version for testing
class SuperParser {
  constructor() {
    this.allNetworks = new Map();
    this.restrictionPatterns = {
      prohibited: /prohibited/i,
      noRoaming: /no permanent roaming/i,
      dataNotLaunched: /data not launched/i,
      noResell: /no resell/i,
      accessFee: /(\d+\.?\d*)\s*access fee/i
    };
  }

  parseNumber(value) {
    if (!value) return 0;
    const str = String(value).replace(/[^\d.-]/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  }

  parseRestrictions(text) {
    const result = {};
    if (!text) return result;
    
    if (this.restrictionPatterns.prohibited.test(text)) {
      result.prohibitedNetwork = true;
    }
    if (this.restrictionPatterns.noRoaming.test(text)) {
      result.noRoaming = true;
    }
    if (this.restrictionPatterns.dataNotLaunched.test(text)) {
      result.dataNotLaunched = true;
    }
    if (this.restrictionPatterns.noResell.test(text)) {
      result.noResell = true;
    }
    
    // Extract access fee from comments
    const accessFeeMatch = text.match(this.restrictionPatterns.accessFee);
    if (accessFeeMatch) {
      result.extractedAccessFee = parseFloat(accessFeeMatch[1]);
    }
    
    return result;
  }

  parseInvoiceFile(filePath) {
    console.log('\n📄 Parsing Invoice file:', filePath);
    
    const workbook = XLSX.readFile(filePath);
    const results = [];
    
    // Parse the Pricelist sheet
    const priceSheet = workbook.Sheets['Pricelist 2024-11-01'];
    if (priceSheet) {
      const data = XLSX.utils.sheet_to_json(priceSheet, { header: 1 });
      
      console.log(`Found ${data.length} rows in price sheet`);
      
      // Process data rows (skip header)
      for (let i = 1; i < data.length && i < 50; i++) { // Sample first 50
        const row = data[i];
        if (!row[0] || !row[2]) continue;
        
        const tadig = String(row[2]).trim();
        const comments = row[9] ? String(row[9]).trim() : '';
        
        // Parse access fee from column or comments
        let accessFee = 0;
        if (row[8]) {
          if (typeof row[8] === 'number') {
            accessFee = row[8];
          } else {
            const feeStr = String(row[8]).replace(/[^\d.]/g, '');
            accessFee = parseFloat(feeStr) || 0;
          }
        }
        
        // Also check comments for access fee
        const restrictions = this.parseRestrictions(comments);
        if (restrictions.extractedAccessFee && !accessFee) {
          accessFee = restrictions.extractedAccessFee;
        }
        
        const network = {
          tadig,
          country: String(row[0]).trim(),
          network: String(row[1]).trim(),
          imsiAccessFee: accessFee,
          dataPerMB: this.parseNumber(row[6]),
          smsRate: this.parseNumber(row[5]),
          voiceRate: this.parseNumber(row[3]),
          source: 'Invoice',
          specialNotes: comments,
          ...restrictions
        };
        
        results.push(network);
        this.allNetworks.set(tadig, network);
      }
    }
    
    console.log(`✅ Parsed ${results.length} networks from Invoice`);
    
    // Show sample of networks with restrictions
    const restricted = results.filter(n => n.prohibitedNetwork || n.dataNotLaunched || n.noRoaming);
    if (restricted.length > 0) {
      console.log(`\n⚠️  Found ${restricted.length} networks with restrictions:`);
      restricted.slice(0, 5).forEach(n => {
        console.log(`  ${n.tadig} (${n.network}): ${n.specialNotes}`);
      });
    }
    
    // Show networks with IMSI fees
    const withFees = results.filter(n => n.imsiAccessFee > 0);
    if (withFees.length > 0) {
      console.log(`\n💰 Found ${withFees.length} networks with IMSI fees:`);
      withFees.slice(0, 5).forEach(n => {
        console.log(`  ${n.tadig} (${n.network}): €${n.imsiAccessFee}`);
      });
    }
    
    return results;
  }

  parseA1File(filePath) {
    console.log('\n📘 Parsing A1 file:', filePath);
    
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['prices A1 WS'];
    
    if (!sheet) {
      console.error('❌ A1 prices sheet not found');
      return [];
    }
    
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const results = [];
    
    // Data starts at row 8
    for (let i = 8; i < data.length && i < 100; i++) { // Sample first 100
      const row = data[i];
      if (!row[0] || !row[4]) continue;
      
      const tadig = String(row[4]).trim();
      const restrictions = String(row[6] || '').trim();
      
      const network = {
        tadig,
        country: String(row[0]).trim(),
        network: String(row[1]).trim(),
        mccMnc: String(row[5] || '').trim(),
        imsiAccessFee: this.parseNumber(row[24]), // General column
        dataPerMB: this.parseNumber(row[27]),      // price/MB column
        smsOutgoing: this.parseNumber(row[30]),
        smsIncoming: this.parseNumber(row[31]),
        technologies: {
          gsm: row[8] === 'Live',
          gprs2G: row[9] === 'Live',
          umts3G: row[10] === 'Live',
          lte4G: row[11] === 'Live',
          lte5G: row[12] === 'Live',
          lteM: row[13] === 'Live',
          nbIot: row[16] === 'Live'
        },
        source: 'A1',
        restrictions,
        ...this.parseRestrictions(restrictions)
      };
      
      results.push(network);
      
      // Update master map if not from Invoice
      const existing = this.allNetworks.get(tadig);
      if (!existing || existing.source !== 'Invoice') {
        this.allNetworks.set(tadig, network);
      }
    }
    
    console.log(`✅ Parsed ${results.length} networks from A1`);
    
    return results;
  }

  // Compare specific networks across sources
  compareNetwork(tadig) {
    const network = this.allNetworks.get(tadig);
    if (!network) {
      console.log(`Network ${tadig} not found`);
      return;
    }
    
    console.log(`\n📊 Network: ${tadig} - ${network.network} (${network.country})`);
    console.log(`  Source: ${network.source}`);
    console.log(`  IMSI Fee: €${network.imsiAccessFee || 0}`);
    console.log(`  Data Rate: $${network.dataPerMB || 0}/MB`);
    
    if (network.prohibitedNetwork) {
      console.log(`  ⚠️  PROHIBITED NETWORK`);
    }
    if (network.dataNotLaunched) {
      console.log(`  ⚠️  DATA NOT LAUNCHED`);
    }
    if (network.specialNotes) {
      console.log(`  Notes: ${network.specialNotes}`);
    }
  }

  getSummary() {
    const networks = Array.from(this.allNetworks.values());
    const bySource = {};
    
    networks.forEach(n => {
      bySource[n.source] = (bySource[n.source] || 0) + 1;
    });
    
    const withIMSI = networks.filter(n => n.imsiAccessFee > 0);
    const prohibited = networks.filter(n => n.prohibitedNetwork);
    const notLaunched = networks.filter(n => n.dataNotLaunched);
    
    return {
      totalNetworks: networks.length,
      networksWithIMSI: withIMSI.length,
      prohibitedNetworks: prohibited.length,
      dataNotLaunched: notLaunched.length,
      bySource
    };
  }
}

// Test the parser
console.log('🚀 Super Parser Test\n');
console.log('=' .repeat(50));

const parser = new SuperParser();

// Parse Invoice file (with IMSI fees and restrictions)
if (fs.existsSync('0- Invoice Monogoto 2025-04.xlsx')) {
  parser.parseInvoiceFile('0- Invoice Monogoto 2025-04.xlsx');
}

// Parse A1 file
if (fs.existsSync('202509_Country Price List A1 IMSI Sponsoring.xlsx')) {
  parser.parseA1File('202509_Country Price List A1 IMSI Sponsoring.xlsx');
}

// Show summary
console.log('\n' + '='.repeat(50));
console.log('📊 OVERALL SUMMARY');
console.log('='.repeat(50));

const summary = parser.getSummary();
console.log(`Total Networks: ${summary.totalNetworks}`);
console.log(`Networks with IMSI Fees: ${summary.networksWithIMSI}`);
console.log(`Prohibited Networks: ${summary.prohibitedNetworks}`);
console.log(`Data Not Launched: ${summary.dataNotLaunched}`);
console.log(`\nBy Source:`);
Object.entries(summary.bySource).forEach(([source, count]) => {
  console.log(`  ${source}: ${count} networks`);
});

// Check specific Australia networks
console.log('\n' + '='.repeat(50));
console.log('🇦🇺 AUSTRALIA NETWORKS CHECK');
console.log('='.repeat(50));

['AUSTA', 'AUSVF', 'AUSOP', 'AUTMM'].forEach(tadig => {
  parser.compareNetwork(tadig);
});

// Check some networks with restrictions
console.log('\n' + '='.repeat(50));
console.log('⚠️  NETWORKS WITH RESTRICTIONS');
console.log('='.repeat(50));

const restrictedNetworks = Array.from(parser.allNetworks.values())
  .filter(n => n.prohibitedNetwork || n.dataNotLaunched || n.noRoaming)
  .slice(0, 5);

restrictedNetworks.forEach(n => {
  console.log(`\n${n.tadig} - ${n.network} (${n.country})`);
  if (n.prohibitedNetwork) console.log('  ❌ Prohibited Network');
  if (n.dataNotLaunched) console.log('  ⏸️  Data Not Launched');
  if (n.noRoaming) console.log('  🚫 No Permanent Roaming');
  if (n.specialNotes) console.log(`  📝 ${n.specialNotes}`);
});

console.log('\n✅ Super Parser test complete!');