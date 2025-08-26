import * as XLSX from 'xlsx';
import * as fs from 'fs';
export class SuperParser {
    allNetworks = new Map();
    restrictionNotes = new Map();
    constructor() {
        this.initializeKnownRestrictions();
    }
    initializeKnownRestrictions() {
        // Common restriction patterns
        this.restrictionNotes.set('prohibited', 'Network access prohibited');
        this.restrictionNotes.set('no permanent roaming', 'No permanent roaming allowed');
        this.restrictionNotes.set('data not launched', 'Data service not yet launched');
        this.restrictionNotes.set('no resell', 'No reselling on domestic market');
    }
    /**
     * Parse Monogoto Invoice with IMSI fees and restrictions
     */
    async parseInvoiceFile(filePath) {
        console.log('📄 Parsing Invoice file with IMSI fees and notes...');
        const workbook = XLSX.readFile(filePath);
        const results = [];
        // Parse main price list sheet (Pricelist 2024-11-01)
        if (workbook.Sheets['Pricelist 2024-11-01']) {
            const sheet = workbook.Sheets['Pricelist 2024-11-01'];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            // Headers: Country, Network, TADIG, MOC/Min, MTC/Min, SMS, Data/MB, VoLTE/MB, Access fee, Comments
            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                if (!row[0] || !row[2])
                    continue; // Skip if no country or TADIG
                const tadig = String(row[2]).trim();
                const comments = row[9] ? String(row[9]).trim() : '';
                // Parse access fee
                let accessFee = 0;
                if (row[8]) {
                    const feeStr = String(row[8]).replace(/[^\d.]/g, '');
                    accessFee = parseFloat(feeStr) || 0;
                }
                // Parse restrictions from comments
                const restrictions = this.parseRestrictions(comments);
                const network = {
                    tadig,
                    country: String(row[0]).trim(),
                    network: String(row[1]).trim(),
                    imsiAccessFee: accessFee,
                    dataPerMB: this.parseNumber(row[6]),
                    smsOutgoing: this.parseNumber(row[5]),
                    voiceOutgoing: this.parseNumber(row[3]),
                    voiceIncoming: this.parseNumber(row[4]),
                    volte: row[7] ? this.parseNumber(row[7]) > 0 : false,
                    currency: 'EUR',
                    source: 'Invoice',
                    specialNotes: comments,
                    ...restrictions,
                    lastUpdated: new Date()
                };
                results.push(network);
                this.allNetworks.set(tadig, network);
            }
        }
        // Parse IMSI fee sheet if exists
        if (workbook.Sheets['Network Access fee per IMSI']) {
            const imsiSheet = workbook.Sheets['Network Access fee per IMSI'];
            const imsiData = XLSX.utils.sheet_to_json(imsiSheet, { header: 1 });
            // Update IMSI fees for existing networks
            for (let i = 4; i < imsiData.length; i++) {
                const row = imsiData[i];
                const tadig = String(row[0]).trim();
                const imsiFee = this.parseNumber(row[2]);
                if (this.allNetworks.has(tadig)) {
                    const network = this.allNetworks.get(tadig);
                    network.imsiAccessFee = imsiFee;
                }
            }
        }
        console.log(`✅ Parsed ${results.length} networks from Invoice`);
        return results;
    }
    /**
     * Parse A1 format with comprehensive technology and restriction data
     */
    async parseA1File(filePath) {
        console.log('📘 Parsing A1 file...');
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets['prices A1 WS'];
        if (!sheet) {
            console.error('❌ A1 prices sheet not found');
            return [];
        }
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const results = [];
        // Data starts at row 8, headers at row 7
        for (let i = 8; i < data.length; i++) {
            const row = data[i];
            if (!row[0] || !row[4])
                continue; // Skip if no country or TADIG
            const tadig = String(row[4]).trim();
            const restrictions = String(row[6] || '').trim();
            // Parse technologies
            const gsm = row[8] === 'Live';
            const gprs2G = row[9] === 'Live';
            const umts3G = row[10] === 'Live';
            const lte4G = row[11] === 'Live';
            const lte5G = row[12] === 'Live';
            const lteM = row[13] === 'Live';
            const nbIot = row[16] === 'Live';
            // Parse IMSI fee (General column 24)
            const imsiAccessFee = this.parseNumber(row[24]);
            // Parse data rate (price/MB column 27)
            const dataPerMB = this.parseNumber(row[27]);
            // SMS rates (columns 30, 31)
            const smsOutgoing = this.parseNumber(row[30]);
            const smsIncoming = this.parseNumber(row[31]);
            // Voice rates (columns 32, 36)
            const voiceOutgoing = this.parseNumber(row[32]);
            const voiceIncoming = this.parseNumber(row[36]);
            // Parse closure dates
            const closureDate2G = String(row[20] || '').trim();
            const closureDate3G = String(row[22] || '').trim();
            const network = {
                tadig,
                country: String(row[0]).trim(),
                network: String(row[1]).trim(),
                mccMnc: String(row[5] || '').trim(),
                imsiAccessFee,
                dataPerMB,
                smsOutgoing,
                smsIncoming,
                voiceOutgoing,
                voiceIncoming,
                gsm,
                gprs2G,
                umts3G,
                lte4G,
                lte5G,
                lteM,
                nbIot,
                currency: String(row[23] || 'EUR').trim(),
                source: 'A1',
                restrictions,
                specialNotes: restrictions,
                dataIncrement: String(row[28] || '').trim(),
                region: String(row[3] || '').trim(),
                group: String(row[2] || '').trim(),
                closureDate2G,
                closureDate3G,
                lastUpdated: new Date()
            };
            // Check for specific restrictions
            if (restrictions) {
                const restrictionParsed = this.parseRestrictions(restrictions);
                Object.assign(network, restrictionParsed);
            }
            results.push(network);
            // Update or add to master map
            const existing = this.allNetworks.get(tadig);
            if (!existing || existing.source !== 'Invoice') {
                this.allNetworks.set(tadig, network);
            }
        }
        console.log(`✅ Parsed ${results.length} networks from A1`);
        return results;
    }
    /**
     * Parse Telefonica format
     */
    async parseTelefonicaFile(filePath) {
        console.log('📕 Parsing Telefonica file...');
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets['Format All'] || workbook.Sheets[workbook.SheetNames[0]];
        if (!sheet) {
            console.error('❌ Telefonica sheet not found');
            return [];
        }
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const results = [];
        // Headers at row 0, data starts at row 1
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row[0] || !row[2])
                continue; // Skip if no country or TADIG
            const tadig = String(row[2]).trim();
            // Parse technologies
            const gsm = row[14] === 'Live';
            const gprs2G = row[17] === 'Live';
            const umts3G = row[18] === 'Live';
            const lte4G = row[19] === 'Live';
            const lte5G = row[20] === 'Live';
            const volte = row[21] === 'Live';
            const lteM = row[22] === 'Live';
            const nbIot = row[25] === 'Live';
            const network = {
                tadig,
                country: String(row[0]).trim(),
                network: String(row[1]).trim(),
                imsiAccessFee: 0, // Telefonica doesn't have IMSI fees
                dataPerMB: this.parseNumber(row[10]),
                smsOutgoing: this.parseNumber(row[13]),
                voiceOutgoing: this.parseNumber(row[3]),
                voiceIncoming: this.parseNumber(row[6]),
                gsm,
                gprs2G,
                umts3G,
                lte4G,
                lte5G,
                lteM,
                nbIot,
                volte,
                currency: 'USD',
                source: 'Telefonica',
                specialNotes: String(row[26] || '').trim(),
                status: String(row[27] || '').trim(),
                lastUpdated: new Date()
            };
            results.push(network);
            // Update master map if not exists or lower priority
            const existing = this.allNetworks.get(tadig);
            if (!existing || (existing.source !== 'Invoice' && existing.source !== 'A1')) {
                this.allNetworks.set(tadig, network);
            }
        }
        console.log(`✅ Parsed ${results.length} networks from Telefonica`);
        return results;
    }
    /**
     * Parse Tele2 format (usage data, not pricing)
     */
    async parseTele2File(filePath) {
        console.log('📗 Parsing Tele2 file...');
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!sheet) {
            console.error('❌ Tele2 sheet not found');
            return [];
        }
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const results = [];
        const processed = new Set();
        // Headers at row 0, data starts at row 1
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const tadig = String(row[0] || '').trim();
            if (!tadig || processed.has(tadig))
                continue;
            processed.add(tadig);
            // Tele2 mainly has usage data, limited pricing
            const network = {
                tadig,
                country: String(row[2] || '').trim(),
                network: String(row[1] || '').trim(),
                imsiAccessFee: 0, // Tele2 doesn't provide IMSI fees
                dataPerMB: this.parseNumber(row[7]), // Cost per MB column
                smsOutgoing: 0,
                currency: 'USD',
                source: 'Tele2',
                lastUpdated: new Date()
            };
            results.push(network);
            // Only update if no existing data
            if (!this.allNetworks.has(tadig)) {
                this.allNetworks.set(tadig, network);
            }
        }
        console.log(`✅ Parsed ${results.length} unique networks from Tele2`);
        return results;
    }
    /**
     * Parse restriction text into structured flags
     */
    parseRestrictions(text) {
        const lower = text.toLowerCase();
        const result = {};
        if (lower.includes('prohibited')) {
            result.prohibitedNetwork = true;
        }
        if (lower.includes('no permanent roaming')) {
            result.noRoaming = true;
        }
        if (lower.includes('data not launched')) {
            result.dataNotLaunched = true;
        }
        if (lower.includes('no resell')) {
            result.specialNotes = (result.specialNotes || '') + ' No reselling on domestic market';
        }
        return result;
    }
    /**
     * Parse number from various formats
     */
    parseNumber(value) {
        if (!value)
            return 0;
        const str = String(value).replace(/[^\d.-]/g, '');
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    }
    /**
     * Get merged pricing for a TADIG with source priority
     */
    getNetworkPricing(tadig) {
        return this.allNetworks.get(tadig) || null;
    }
    /**
     * Get all networks with specific restrictions
     */
    getRestrictedNetworks() {
        return Array.from(this.allNetworks.values()).filter(n => n.prohibitedNetwork || n.noRoaming || n.dataNotLaunched);
    }
    /**
     * Get networks with IMSI fees
     */
    getNetworksWithIMSIFees() {
        return Array.from(this.allNetworks.values()).filter(n => n.imsiAccessFee > 0);
    }
    /**
     * Compare pricing between sources for a TADIG
     */
    comparePricing(tadig) {
        const result = { differences: [] };
        // Load all sources for this TADIG
        // This would need to be implemented with stored data from each parse
        return result;
    }
    /**
     * Export consolidated pricing to CSV
     */
    exportToCSV(filePath) {
        const headers = [
            'TADIG', 'Country', 'Network', 'Source', 'IMSI Fee', 'Data/MB',
            'SMS Out', 'Voice Out', 'Restrictions', 'Special Notes'
        ];
        const rows = Array.from(this.allNetworks.values()).map(n => [
            n.tadig,
            n.country,
            n.network,
            n.source,
            n.imsiAccessFee,
            n.dataPerMB,
            n.smsOutgoing || 0,
            n.voiceOutgoing || 0,
            n.prohibitedNetwork ? 'PROHIBITED' : '',
            n.specialNotes || ''
        ]);
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        fs.writeFileSync(filePath, csv);
        console.log(`📊 Exported ${rows.length} networks to ${filePath}`);
    }
    /**
     * Get summary statistics
     */
    getSummary() {
        const networks = Array.from(this.allNetworks.values());
        const bySource = {};
        networks.forEach(n => {
            bySource[n.source] = (bySource[n.source] || 0) + 1;
        });
        const withIMSI = networks.filter(n => n.imsiAccessFee > 0);
        const prohibited = networks.filter(n => n.prohibitedNetwork);
        return {
            totalNetworks: networks.length,
            networksWithIMSI: withIMSI.length,
            prohibitedNetworks: prohibited.length,
            averageDataRate: networks.reduce((sum, n) => sum + n.dataPerMB, 0) / networks.length,
            averageIMSIFee: withIMSI.reduce((sum, n) => sum + n.imsiAccessFee, 0) / (withIMSI.length || 1),
            bySource
        };
    }
}
// Export for use in other modules
export default SuperParser;
//# sourceMappingURL=superParser.js.map