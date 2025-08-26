import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
export class ComprehensiveParser {
    allData = [];
    tadigToNetwork = new Map();
    constructor() {
        this.initializeTadigMapping();
    }
    initializeTadigMapping() {
        // Common TADIG to formal network name mappings
        this.tadigToNetwork.set('USACG', 'AT&T');
        this.tadigToNetwork.set('USATM', 'T-Mobile USA');
        this.tadigToNetwork.set('USAVZ', 'Verizon Wireless');
        this.tadigToNetwork.set('DEUD1', 'Deutsche Telekom');
        this.tadigToNetwork.set('DEUD2', 'Vodafone Germany');
        this.tadigToNetwork.set('DEUE0', 'Telefonica O2 Germany');
        this.tadigToNetwork.set('GBRCN', 'EE (Everything Everywhere)');
        this.tadigToNetwork.set('GBRTR', 'Three UK');
        this.tadigToNetwork.set('GBRVF', 'Vodafone UK');
        this.tadigToNetwork.set('FRAOR', 'Orange France');
        this.tadigToNetwork.set('FRASFR', 'SFR');
        this.tadigToNetwork.set('ITAIT', 'TIM (Telecom Italia)');
        this.tadigToNetwork.set('ITAOM', 'Vodafone Italy');
        this.tadigToNetwork.set('ESPTE', 'Movistar (Telefonica)');
        this.tadigToNetwork.set('GRCPF', 'Vodafone Greece');
        this.tadigToNetwork.set('GRLTG', 'Wind Greece');
        this.tadigToNetwork.set('GRDCW', 'Cosmote (OTE)');
    }
    getFormalNetworkName(tadig, operatorName) {
        // Check mapping first
        if (this.tadigToNetwork.has(tadig)) {
            return this.tadigToNetwork.get(tadig);
        }
        // Clean up operator name
        let cleaned = operatorName;
        // Remove country suffix
        cleaned = cleaned.replace(/\s*-\s*.+$/, '');
        // Common replacements
        cleaned = cleaned.replace(/Telekom/i, 'Telecom');
        cleaned = cleaned.replace(/Communications/i, '');
        cleaned = cleaned.replace(/Telecomunicaciones/i, 'Telecom');
        cleaned = cleaned.replace(/Limited|Ltd\.?|Inc\.?|Corp\.?|Company/gi, '');
        cleaned = cleaned.replace(/Mobile|Cellular|Wireless/gi, '');
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        // Add known brand names
        if (cleaned.toLowerCase().includes('orange'))
            return 'Orange';
        if (cleaned.toLowerCase().includes('vodafone'))
            return 'Vodafone';
        if (cleaned.toLowerCase().includes('t-mobile'))
            return 'T-Mobile';
        if (cleaned.toLowerCase().includes('telefonica'))
            return 'Telefonica';
        if (cleaned.toLowerCase().includes('movistar'))
            return 'Movistar';
        if (cleaned.toLowerCase().includes('three') || cleaned === '3')
            return 'Three';
        return cleaned || operatorName;
    }
    async parseA1File() {
        const filePath = path.join(process.cwd(), '..', '202509_Country Price List A1 IMSI Sponsoring.xlsx');
        if (!fs.existsSync(filePath)) {
            console.error('❌ A1 file not found:', filePath);
            return [];
        }
        console.log('📂 Parsing A1 file...');
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets['prices A1 WS'];
        if (!sheet) {
            console.error('❌ A1 prices sheet not found');
            return [];
        }
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        const a1Data = [];
        // Headers are at row 8 (index 7), data starts at row 9 (index 8)
        // Column mapping based on actual file structure:
        // A(0): Country, B(1): Network, C(2): Group, D(3): Region, E(4): TADIG
        // F(5): MCC+MNC, G(6): Restrictions, H(7): SMS-IW
        // I(8): GSM, J(9): 2G GPRS, K(10): 3G UMTS, L(11): 4G LTE, M(12): 5G NSA
        // N(13): LTE-M, O(14): LTE-M PSM, P(15): LTE-M eDRX
        // Q(16): nb-IoT, R(17): nb-IoT PSM, S(18): nb-IoT eDRX
        // T(19): 2G Situation, U(20): 2G Closure Date
        // V(21): 3G Situation, W(22): 3G Closure Date
        // X(23): currency, Y(24): General (IMSI fee), Z(25): additional nb-IoT
        // AA(26): additional LTE-M, AB(27): price/MB, AC(28): increment KB
        // AD(29): Interworking, AE(30): SMS_MO, AF(31): SMS_MT
        // AG(32): Voice_MOC local, AH(33): Voice_MOC EEA, AI(34): Voice_MOC International
        for (let i = 8; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || !row[0] || row[0] === '')
                continue;
            const tadig = (row[4] || '').toString().trim();
            if (!tadig)
                continue;
            const country = (row[0] || '').toString().trim();
            const networkRaw = (row[1] || '').toString().trim();
            const network = this.getFormalNetworkName(tadig, networkRaw);
            // Parse technologies - A1 uses 'yes'/'no'/'in process' values
            const techValue = (val) => {
                const v = (val || '').toString().toLowerCase().trim();
                return v === 'yes' || v === 'live' || v === 'in process';
            };
            const gsm = techValue(row[8]);
            const gprs2G = techValue(row[9]);
            const umts3G = techValue(row[10]);
            const lte4G = techValue(row[11]);
            const lte5G = techValue(row[12]);
            const lteM = techValue(row[13]);
            const nbIot = techValue(row[16]);
            // Parse pricing
            const imsiCost = parseFloat(row[24]) || 0; // General column
            const dataPerMB = parseFloat(row[27]) || 0; // price/MB column
            const smsOutgoing = parseFloat(row[30]) || 0; // SMS_MO
            const smsIncoming = parseFloat(row[31]) || 0; // SMS_MT
            const voiceOutgoing = parseFloat(row[32]) || 0; // Voice_MOC local
            const voiceIncoming = parseFloat(row[36]) || 0; // Voice_MT
            // Parse restrictions and special instructions
            const restrictions = (row[6] || '').toString().trim();
            const dataIncrement = (row[28] || '').toString().trim();
            // Parse closure dates
            const closureDate2G = (row[20] || '').toString().trim();
            const closureDate3G = (row[22] || '').toString().trim();
            a1Data.push({
                tadig,
                country,
                network,
                mccMnc: (row[5] || '').toString().trim(),
                imsiCost,
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
                currency: (row[23] || 'EUR').toString().trim(),
                source: 'A1',
                restrictions,
                dataIncrement,
                region: (row[3] || '').toString().trim(),
                group: (row[2] || '').toString().trim(),
                closureDate2G,
                closureDate3G
            });
        }
        console.log(`✅ Parsed ${a1Data.length} A1 records`);
        return a1Data;
    }
    async parseTelefonicaFile() {
        const filePath = path.join(process.cwd(), '..', '20250205 Monogoto TGS UK V1.xlsx');
        if (!fs.existsSync(filePath)) {
            console.error('❌ Telefonica file not found:', filePath);
            return [];
        }
        console.log('📂 Parsing Telefonica file...');
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets['Format All'];
        if (!sheet) {
            console.error('❌ Telefonica sheet not found');
            return [];
        }
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        const telefonicaData = [];
        // Headers at row 1 (index 0), data starts at row 2 (index 1)
        // Columns: Country(0), Operator(1), Tadig(2), MOC(3), MOC_TSI(4), MOC_TSS(5),
        // MTC(6), MTC_TSI(7), MTC_TSS(8), MRC(9), Data(10), Data_TSI(11), Data_TSS(12),
        // SMS(13), GSM(14), Camel(15), CamelVersion(16), 2G(17), 3G(18), 4G(19), 5G(20),
        // VoLTE(21), LTE-M(22), LTE-M_PSM(23), LTE-M_EDRX(24), NB-IoT(25), NEW(26), Resale(27)
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || !row[0] || row[0] === '')
                continue;
            const tadig = (row[2] || '').toString().trim();
            if (!tadig)
                continue;
            const country = (row[0] || '').toString().trim();
            const operatorRaw = (row[1] || '').toString().trim();
            const network = this.getFormalNetworkName(tadig, operatorRaw);
            // Parse technologies (Live/Unavailable/In Progress)
            const techValue = (val) => {
                const v = (val || '').toString().toLowerCase().trim();
                return v === 'live' || v === 'in progress';
            };
            const gsm = techValue(row[14]);
            const gprs2G = techValue(row[17]);
            const umts3G = techValue(row[18]);
            const lte4G = techValue(row[19]);
            const lte5G = techValue(row[20]);
            const lteM = techValue(row[22]);
            const nbIot = techValue(row[25]);
            // Parse pricing
            const dataPerMB = parseFloat(row[10]) || 0;
            const smsOutgoing = parseFloat(row[13]) || 0;
            const voiceOutgoing = parseFloat(row[3]) || 0; // MOC
            const voiceIncoming = parseFloat(row[6]) || 0; // MTC
            // No explicit IMSI cost in Telefonica format
            const imsiCost = 0;
            // Special instructions from NEW column
            const specialInstructions = (row[26] || '').toString().trim();
            telefonicaData.push({
                tadig,
                country,
                network,
                imsiCost,
                dataPerMB,
                smsOutgoing,
                voiceOutgoing,
                voiceIncoming,
                gsm,
                gprs2G,
                umts3G,
                lte4G,
                lte5G,
                lteM,
                nbIot,
                currency: 'USD', // Telefonica uses USD
                source: 'Telefonica',
                specialInstructions,
                status: (row[27] || '').toString().trim() // Resale column
            });
        }
        console.log(`✅ Parsed ${telefonicaData.length} Telefonica records`);
        return telefonicaData;
    }
    async parseTele2File() {
        const filePath = path.join(process.cwd(), '..', 'Tele2 data fee June-23 analysis.xlsx');
        if (!fs.existsSync(filePath)) {
            console.error('❌ Tele2 file not found:', filePath);
            return [];
        }
        console.log('📂 Parsing Tele2 file...');
        const workbook = XLSX.readFile(filePath);
        // Try multiple possible sheet names
        const sheetNames = ['Cost DATA by customer', 'Tele2 - data 6.23', 'Summary'];
        let sheet = null;
        let sheetName = '';
        for (const name of sheetNames) {
            if (workbook.Sheets[name]) {
                sheet = workbook.Sheets[name];
                sheetName = name;
                break;
            }
        }
        if (!sheet) {
            // Use first sheet if specific ones not found
            sheetName = workbook.SheetNames[0];
            sheet = workbook.Sheets[sheetName];
        }
        console.log(`  Using sheet: ${sheetName}`);
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        const tele2Data = [];
        const uniqueNetworks = new Set();
        // Parse based on sheet structure
        if (sheetName === 'Cost DATA by customer') {
            // Headers: TADIG(0), CustomerName(1), Network name(2), Active SIM amount(3),
            // Sum of Usage(4), GB(5), MB(6), Cost per MB(7), Total Charge(8)
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || !row[0] || row[0] === '')
                    continue;
                const tadig = (row[0] || '').toString().trim();
                const networkKey = `${tadig}`;
                if (uniqueNetworks.has(networkKey))
                    continue;
                uniqueNetworks.add(networkKey);
                const networkInfo = (row[2] || '').toString().trim();
                const parts = networkInfo.split(' - ');
                const operatorRaw = parts[0] || networkInfo;
                const country = parts[1] || 'Unknown';
                const network = this.getFormalNetworkName(tadig, operatorRaw);
                const dataPerMB = parseFloat(row[7]) || 0;
                tele2Data.push({
                    tadig,
                    country,
                    network,
                    imsiCost: 0, // Not provided in Tele2
                    dataPerMB,
                    currency: 'USD',
                    source: 'Tele2',
                    // Default to 4G/3G as Tele2 doesn't specify
                    lte4G: true,
                    umts3G: true
                });
            }
        }
        else {
            // Try parsing monthly sheet format
            // Headers: PMN(0), Roaming Partner(1), Country(2), Customer(3), 
            // Record Type(4), SubRecord Type(5), Number of calls(6), 
            // Duration(7), Total Volume MB(8), Charge(9), Price per mb(10)
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || !row[0] || row[0] === '')
                    continue;
                const tadig = (row[0] || '').toString().trim();
                const networkKey = tadig;
                if (uniqueNetworks.has(networkKey))
                    continue;
                uniqueNetworks.add(networkKey);
                const country = (row[2] || '').toString().trim();
                const operatorRaw = (row[1] || '').toString().trim();
                const network = this.getFormalNetworkName(tadig, operatorRaw);
                const dataPerMB = parseFloat(row[10]) || 0;
                if (dataPerMB > 0) {
                    tele2Data.push({
                        tadig,
                        country,
                        network,
                        imsiCost: 0,
                        dataPerMB,
                        currency: 'USD',
                        source: 'Tele2',
                        lte4G: true,
                        umts3G: true
                    });
                }
            }
        }
        console.log(`✅ Parsed ${tele2Data.length} Tele2 records`);
        return tele2Data;
    }
    async loadAllData() {
        console.log('🔄 Starting comprehensive data parsing...\n');
        const [a1Data, telefonicaData, tele2Data] = await Promise.all([
            this.parseA1File(),
            this.parseTelefonicaFile(),
            this.parseTele2File()
        ]);
        this.allData = [...a1Data, ...telefonicaData, ...tele2Data];
        console.log(`\n📊 Total records loaded: ${this.allData.length}`);
        console.log(`   A1: ${a1Data.length} records`);
        console.log(`   Telefonica: ${telefonicaData.length} records`);
        console.log(`   Tele2: ${tele2Data.length} records`);
        // Count unique TADIGs
        const uniqueTadigs = new Set(this.allData.map(d => d.tadig));
        console.log(`   Unique TADIGs: ${uniqueTadigs.size}`);
        return this.allData;
    }
    searchNetworks(query) {
        const searchTerm = query.toLowerCase();
        return this.allData.filter(item => item.country.toLowerCase().includes(searchTerm) ||
            item.network.toLowerCase().includes(searchTerm) ||
            item.tadig.toLowerCase().includes(searchTerm));
    }
    getNetworkComparison(network, country) {
        return this.allData.filter(item => item.network.toLowerCase() === network.toLowerCase() &&
            item.country.toLowerCase() === country.toLowerCase());
    }
    getAllData() {
        return this.allData;
    }
}
//# sourceMappingURL=comprehensiveParser.js.map