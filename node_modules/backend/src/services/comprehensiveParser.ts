import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

/**
 * COMPREHENSIVE PARSER - PRODUCTION VERSION WITH ALL FIXES
 * 
 * ⚠️ CRITICAL: This parser contains essential fixes for data quality issues.
 * DO NOT use old Python import scripts without these fixes!
 * 
 * FIXES INCLUDED:
 * 1. Country/Network field mapping (CANST was getting country="Unknown", network="Canada")
 * 2. TADIG to country mapping for Tele2 data (294 networks had Unknown country)
 * 3. HTML entity cleaning (&amp; -> &)
 * 4. Country name normalization (St. -> Saint, & -> and)
 * 5. Network name preservation (keeps "Canada - SaskTel" intact)
 * 6. Removal of trailing TADIG codes from network names
 * 
 * KNOWN ISSUES FIXED:
 * - CANST (Canada SaskTel): Was swapped, now correct
 * - ISR* networks: Had Unknown country, now shows Israel
 * - AT&T: Had HTML entities, now clean
 * - Network names with country prefixes: Now handled correctly
 * 
 * VALIDATION: After import, run: python3 validate-import.py
 * 
 * @author Fixed by Claude on 2024-01-21
 * @see IMPORTANT-DATA-IMPORT-README.md for full documentation
 */

export interface NetworkPricing {
  tadig: string;
  country: string;
  network: string;  // Formal network name
  mccMnc?: string;
  
  // Pricing
  imsiCost: number;  // One-time IMSI fee
  dataPerMB: number;
  smsOutgoing?: number;
  smsIncoming?: number;
  voiceOutgoing?: number;
  voiceIncoming?: number;
  
  // Technologies
  gsm?: boolean;
  gprs2G?: boolean;
  umts3G?: boolean;
  lte4G?: boolean;
  lte5G?: boolean;
  lteM?: boolean;
  nbIot?: boolean;
  
  // Meta
  currency: string;
  source: 'A1' | 'Telefonica' | 'Tele2';
  restrictions?: string;
  specialInstructions?: string;
  dataIncrement?: string;  // KB increments
  region?: string;
  group?: string;
  
  // Status
  status?: string;
  closureDate2G?: string;
  closureDate3G?: string;
}

export class ComprehensiveParser {
  private allData: NetworkPricing[] = [];
  private tadigToNetwork: Map<string, string> = new Map();

  constructor() {
    this.initializeTadigMapping();
  }

  private initializeTadigMapping() {
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

  private getCountryFromTadig(tadig: string): string | null {
    // Map common TADIG prefixes to countries
    const tadigCountryMap: { [key: string]: string } = {
      'USA': 'United States', 'CAN': 'Canada', 'MEX': 'Mexico',
      'GBR': 'United Kingdom', 'FRA': 'France', 'DEU': 'Germany', 
      'ITA': 'Italy', 'ESP': 'Spain', 'PRT': 'Portugal',
      'NLD': 'Netherlands', 'BEL': 'Belgium', 'LUX': 'Luxembourg',
      'CHE': 'Switzerland', 'AUT': 'Austria', 'DNK': 'Denmark',
      'SWE': 'Sweden', 'NOR': 'Norway', 'FIN': 'Finland',
      'ISL': 'Iceland', 'IRL': 'Ireland', 'POL': 'Poland',
      'CZE': 'Czech Republic', 'SVK': 'Slovakia', 'HUN': 'Hungary',
      'ROM': 'Romania', 'BGR': 'Bulgaria', 'GRC': 'Greece',
      'TUR': 'Turkey', 'ISR': 'Israel', 'PSE': 'Palestine',
      'JOR': 'Jordan', 'LBN': 'Lebanon', 'SAU': 'Saudi Arabia',
      'ARE': 'United Arab Emirates', 'OMN': 'Oman', 'QAT': 'Qatar',
      'BHR': 'Bahrain', 'KWT': 'Kuwait', 'EGY': 'Egypt',
      'MAR': 'Morocco', 'DZA': 'Algeria', 'TUN': 'Tunisia',
      'ZAF': 'South Africa', 'KEN': 'Kenya', 'UGA': 'Uganda',
      'TZA': 'Tanzania', 'RWA': 'Rwanda', 'ETH': 'Ethiopia',
      'NGA': 'Nigeria', 'GHA': 'Ghana', 'CMR': 'Cameroon',
      'SEN': 'Senegal', 'CIV': 'Ivory Coast', 'MLI': 'Mali',
      'BFA': 'Burkina Faso', 'ZWE': 'Zimbabwe', 'ZMB': 'Zambia',
      'MOZ': 'Mozambique', 'BWA': 'Botswana', 'NAM': 'Namibia',
      'MWI': 'Malawi', 'MDG': 'Madagascar', 'MUS': 'Mauritius',
      'IND': 'India', 'PAK': 'Pakistan', 'BGD': 'Bangladesh',
      'LKA': 'Sri Lanka', 'NPL': 'Nepal', 'BTN': 'Bhutan',
      'CHN': 'China', 'HKG': 'Hong Kong', 'MAC': 'Macau',
      'TWN': 'Taiwan', 'JPN': 'Japan', 'KOR': 'South Korea',
      'PRK': 'North Korea', 'MNG': 'Mongolia', 'VNM': 'Vietnam',
      'THA': 'Thailand', 'MYS': 'Malaysia', 'SGP': 'Singapore',
      'IDN': 'Indonesia', 'PHL': 'Philippines', 'KHM': 'Cambodia',
      'LAO': 'Laos', 'MMR': 'Myanmar', 'AUS': 'Australia',
      'NZL': 'New Zealand', 'PNG': 'Papua New Guinea', 'FJI': 'Fiji',
      'BRA': 'Brazil', 'ARG': 'Argentina', 'CHL': 'Chile',
      'PER': 'Peru', 'COL': 'Colombia', 'VEN': 'Venezuela',
      'ECU': 'Ecuador', 'BOL': 'Bolivia', 'PRY': 'Paraguay',
      'URY': 'Uruguay', 'GUY': 'Guyana', 'SUR': 'Suriname',
      'GUF': 'French Guiana', 'CRI': 'Costa Rica', 'PAN': 'Panama',
      'NIC': 'Nicaragua', 'HND': 'Honduras', 'SLV': 'El Salvador',
      'GTM': 'Guatemala', 'DOM': 'Dominican Republic', 'HTI': 'Haiti',
      'JAM': 'Jamaica', 'CUB': 'Cuba', 'PRI': 'Puerto Rico',
      'TTO': 'Trinidad and Tobago', 'BRB': 'Barbados', 'BHS': 'Bahamas',
      'BMU': 'Bermuda', 'VGB': 'British Virgin Islands', 'CYM': 'Cayman Islands',
      'RUS': 'Russia', 'UKR': 'Ukraine', 'BLR': 'Belarus',
      'MDA': 'Moldova', 'GEO': 'Georgia', 'ARM': 'Armenia',
      'AZE': 'Azerbaijan', 'KAZ': 'Kazakhstan', 'UZB': 'Uzbekistan',
      'TKM': 'Turkmenistan', 'KGZ': 'Kyrgyzstan', 'TJK': 'Tajikistan',
      'AFG': 'Afghanistan', 'IRN': 'Iran', 'IRQ': 'Iraq',
      'SYR': 'Syria', 'YEM': 'Yemen', 'LBY': 'Libya',
      'SDN': 'Sudan', 'SSD': 'South Sudan', 'SOM': 'Somalia',
      'DJI': 'Djibouti', 'ERI': 'Eritrea', 'MLT': 'Malta',
      'CYP': 'Cyprus', 'LIE': 'Liechtenstein', 'MCO': 'Monaco',
      'AND': 'Andorra', 'SMR': 'San Marino', 'VAT': 'Vatican City',
      'MKD': 'North Macedonia', 'ALB': 'Albania', 'MNE': 'Montenegro',
      'SRB': 'Serbia', 'BIH': 'Bosnia and Herzegovina', 'HRV': 'Croatia',
      'SVN': 'Slovenia', 'EST': 'Estonia', 'LVA': 'Latvia',
      'LTU': 'Lithuania', 'GEO': 'Georgia', 'ARM': 'Armenia',
      'YUG': 'Serbia', 'COD': 'Democratic Republic of Congo',
      'COG': 'Republic of Congo', 'GAB': 'Gabon', 'GNQ': 'Equatorial Guinea',
      'TCD': 'Chad', 'CAF': 'Central African Republic', 'STP': 'Sao Tome and Principe',
      'GIN': 'Guinea', 'GNB': 'Guinea-Bissau', 'LBR': 'Liberia',
      'SLE': 'Sierra Leone', 'GMB': 'Gambia', 'MRT': 'Mauritania',
      'CPV': 'Cape Verde', 'BEN': 'Benin', 'TGO': 'Togo',
      'NER': 'Niger', 'BDI': 'Burundi', 'AGO': 'Angola',
      'LSO': 'Lesotho', 'SWZ': 'Eswatini', 'REU': 'Reunion',
      'MYT': 'Mayotte', 'COM': 'Comoros', 'SYC': 'Seychelles',
      'VCT': 'St. Vincent', 'LCA': 'St. Lucia', 'ABW': 'Aruba',
      'K00': 'Kosovo'  // Special case for Kosovo
    };
    
    // Try first 3 characters of TADIG
    const prefix = tadig.substring(0, 3).toUpperCase();
    if (tadigCountryMap[prefix]) {
      return tadigCountryMap[prefix];
    }
    
    // Special cases for LTE private networks
    if (tadig.startsWith('LTE')) return 'Private Network';
    
    return null;
  }

  private cleanHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }

  private normalizeCountryName(country: string): string {
    // Clean HTML entities first
    let normalized = this.cleanHtmlEntities(country);
    
    // Fix known wrong country names
    const countryFixes: { [key: string]: string } = {
      'ALBANIA': 'Albania',
      'BRACS': 'Brazil',
      'BRASP': 'Brazil',
      'COMUNICAÇÕES PESSOAIS, S.A.': 'Portugal',
      'SERVIÇOS DE COMUNICAÇÕES E MULTIMÉDIA SA': 'Portugal',
      'MNGMN': 'Mongolia',
      'Algeria Telecom Mobile': 'Algeria',
      'Antigua & Barbuda': 'Antigua and Barbuda',
      'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
      'Congo, Democratic Republic of the': 'Democratic Republic of Congo',
      'Lao People\'s Democratic Republic': 'Laos',
      'St. Kitts & Nevis': 'Saint Kitts and Nevis',
      'St. Lucia': 'Saint Lucia',
      'St. Vincent & Grenadines': 'Saint Vincent and the Grenadines',
      'St. Vincent and the Grenadines': 'Saint Vincent and the Grenadines',
      'St. Vincent': 'Saint Vincent and the Grenadines',
      'Taiwan, Province of China': 'Taiwan',
      'Turks & Caicos': 'Turks and Caicos Islands',
      'Trinidad & Tobago': 'Trinidad and Tobago',
    };
    
    return countryFixes[normalized] || normalized;
  }

  private getFormalNetworkName(tadig: string, operatorName: string): string {
    // Check mapping first
    if (this.tadigToNetwork.has(tadig)) {
      return this.tadigToNetwork.get(tadig)!;
    }
    
    // Clean HTML entities
    let cleaned = this.cleanHtmlEntities(operatorName);
    
    // Remove country prefixes from network names (but keep important suffixes like "- SaskTel")
    // Only remove if it's "Country - NetworkName" format
    const countryPrefixes = [
      'Argentina - ', 'Australia - ', 'Brazil - ', 'Chile - ',
      'China - ', 'Egypt - ', 'France - ', 'Germany - ',
      'India - ', 'Israel - ', 'Italy - ', 'Japan - ',
      'Mexico - ', 'Nigeria - ', 'Russia - ', 'Saudi Arabia - ',
      'South Africa - ', 'Spain - ', 'United Kingdom - ', 'United States - '
    ];
    
    // Check if it starts with a country prefix but preserve important network names
    for (const prefix of countryPrefixes) {
      if (cleaned.startsWith(prefix)) {
        const networkPart = cleaned.substring(prefix.length);
        // Keep the full name for Canadian networks and similar patterns
        if (prefix === 'Canada - ') {
          // Keep as is for Canadian networks
          return cleaned;
        }
        // For others, remove the country prefix
        cleaned = networkPart;
        break;
      }
    }
    
    // Shorten very long network names
    const longNameFixes: { [key: string]: string } = {
      'Egyptian for Mobile Services (ECMS) MobiNil (Orange) (EGYAR)': 'MobiNil (Orange)',
      'Conecel S.A. (Consorcio Ecuatoriano de Telecomunicaciones S.A.)': 'Conecel',
      'AT&T Comercializacion Movil, S. de R.L. de C.V. MEXIU': 'AT&T Mexico',
      'Tunisian Mauritanian of Telecommunications (MATTEL)': 'Mattel',
    };
    
    if (longNameFixes[cleaned]) {
      cleaned = longNameFixes[cleaned];
    }
    
    // Common replacements (but preserve the full name structure)
    cleaned = cleaned.replace(/\b(Limited|Ltd\.?|Inc\.?|Corp\.?|Company)\b/gi, '');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Remove trailing TADIG codes from network names
    cleaned = cleaned.replace(/\s+[A-Z]{5}\d*$/, '').trim();
    
    // Special handling for known brand names (only if they're the primary operator)
    if (cleaned.toLowerCase() === 'orange') return 'Orange';
    if (cleaned.toLowerCase() === 'vodafone') return 'Vodafone';
    if (cleaned.toLowerCase() === 't-mobile') return 'T-Mobile';
    if (cleaned.toLowerCase() === 'telefonica') return 'Telefonica';
    if (cleaned.toLowerCase() === 'movistar') return 'Movistar';
    if (cleaned.toLowerCase() === 'three' || cleaned === '3') return 'Three';
    
    return cleaned || operatorName;
  }

  async parseA1File(): Promise<NetworkPricing[]> {
    // Try multiple possible locations for the file
    const possiblePaths = [
      path.join(process.cwd(), '202509_Country Price List A1 IMSI Sponsoring.xlsx'),
      path.join(process.cwd(), '..', '202509_Country Price List A1 IMSI Sponsoring.xlsx'),
      path.join(__dirname, '../../../', '202509_Country Price List A1 IMSI Sponsoring.xlsx')
    ];
    
    const filePath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
    
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

    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
    const a1Data: NetworkPricing[] = [];
    
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
      if (!row || !row[0] || row[0] === '') continue;
      
      const tadig = (row[4] || '').toString().trim();
      if (!tadig) continue;
      
      const countryRaw = (row[0] || '').toString().trim();
      const country = this.normalizeCountryName(countryRaw);
      const networkRaw = (row[1] || '').toString().trim();
      const network = this.getFormalNetworkName(tadig, networkRaw);
      
      // Parse technologies - A1 uses 'yes'/'no'/'in process' values
      const techValue = (val: any) => {
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
      const imsiCost = parseFloat(row[24]) || 0;  // General column
      const dataPerMB = parseFloat(row[27]) || 0;  // price/MB column
      const smsOutgoing = parseFloat(row[30]) || 0;  // SMS_MO
      const smsIncoming = parseFloat(row[31]) || 0;  // SMS_MT
      const voiceOutgoing = parseFloat(row[32]) || 0;  // Voice_MOC local
      const voiceIncoming = parseFloat(row[36]) || 0;  // Voice_MT
      
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

  async parseTelefonicaFile(): Promise<NetworkPricing[]> {
    // Try multiple possible locations for the file
    const possiblePaths = [
      path.join(process.cwd(), '20250205 Monogoto TGS UK V1.xlsx'),
      path.join(process.cwd(), '..', '20250205 Monogoto TGS UK V1.xlsx'),
      path.join(__dirname, '../../../', '20250205 Monogoto TGS UK V1.xlsx')
    ];
    
    const filePath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
    
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

    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
    const telefonicaData: NetworkPricing[] = [];
    
    // Headers at row 1 (index 0), data starts at row 2 (index 1)
    // Columns: Country(0), Operator(1), Tadig(2), MOC(3), MOC_TSI(4), MOC_TSS(5),
    // MTC(6), MTC_TSI(7), MTC_TSS(8), MRC(9), Data(10), Data_TSI(11), Data_TSS(12),
    // SMS(13), GSM(14), Camel(15), CamelVersion(16), 2G(17), 3G(18), 4G(19), 5G(20),
    // VoLTE(21), LTE-M(22), LTE-M_PSM(23), LTE-M_EDRX(24), NB-IoT(25), NEW(26), Resale(27)
    
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || !row[0] || row[0] === '') continue;
      
      const tadig = (row[2] || '').toString().trim();
      if (!tadig) continue;
      
      const countryRaw = (row[0] || '').toString().trim();
      const country = this.normalizeCountryName(countryRaw);
      const operatorRaw = (row[1] || '').toString().trim();
      const network = this.getFormalNetworkName(tadig, operatorRaw);
      
      // Parse technologies (Live/Unavailable/In Progress)
      const techValue = (val: any) => {
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
      const voiceOutgoing = parseFloat(row[3]) || 0;  // MOC
      const voiceIncoming = parseFloat(row[6]) || 0;  // MTC
      
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
        currency: 'USD',  // Telefonica uses USD
        source: 'Telefonica',
        specialInstructions,
        status: (row[27] || '').toString().trim()  // Resale column
      });
    }
    
    console.log(`✅ Parsed ${telefonicaData.length} Telefonica records`);
    return telefonicaData;
  }

  async parseTele2File(): Promise<NetworkPricing[]> {
    // Try multiple possible locations for the file
    const possiblePaths = [
      path.join(process.cwd(), 'Tele2 data fee June-23 analysis.xlsx'),
      path.join(process.cwd(), '..', 'Tele2 data fee June-23 analysis.xlsx'),
      path.join(__dirname, '../../../', 'Tele2 data fee June-23 analysis.xlsx')
    ];
    
    const filePath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
    
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
    
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
    const tele2Data: NetworkPricing[] = [];
    const uniqueNetworks = new Set<string>();
    
    // Parse based on sheet structure
    if (sheetName === 'Cost DATA by customer') {
      // Headers: TADIG(0), CustomerName(1), Network name(2), Active SIM amount(3),
      // Sum of Usage(4), GB(5), MB(6), Cost per MB(7), Total Charge(8)
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || !row[0] || row[0] === '') continue;
        
        const tadig = (row[0] || '').toString().trim();
        const networkKey = `${tadig}`;
        
        if (uniqueNetworks.has(networkKey)) continue;
        uniqueNetworks.add(networkKey);
        
        const networkInfo = (row[2] || '').toString().trim();
        
        // Tele2 format varies:
        // Some entries: "Network Name - Country" (e.g., "Hot Mobile - Israel")
        // Others: just "Network Name" without country
        let operatorRaw = networkInfo;
        let country = 'Unknown';
        
        if (networkInfo.includes(' - ')) {
          const parts = networkInfo.split(' - ');
          operatorRaw = parts[0];
          const countryRaw = parts[1] || 'Unknown';
          country = this.normalizeCountryName(countryRaw);
        } else {
          // Try to extract country from TADIG or network name
          const countryRaw = this.getCountryFromTadig(tadig) || 'Unknown';
          country = this.normalizeCountryName(countryRaw);
          operatorRaw = networkInfo;
        }
        
        const network = this.getFormalNetworkName(tadig, operatorRaw);
        
        const dataPerMB = parseFloat(row[7]) || 0;
        
        tele2Data.push({
          tadig,
          country,
          network,
          imsiCost: 0,  // Not provided in Tele2
          dataPerMB,
          currency: 'USD',
          source: 'Tele2',
          // Default to 4G/3G as Tele2 doesn't specify
          lte4G: true,
          umts3G: true
        });
      }
    } else {
      // Try parsing monthly sheet format
      // Headers: PMN(0), Roaming Partner(1), Country(2), Customer(3), 
      // Record Type(4), SubRecord Type(5), Number of calls(6), 
      // Duration(7), Total Volume MB(8), Charge(9), Price per mb(10)
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || !row[0] || row[0] === '') continue;
        
        const tadig = (row[0] || '').toString().trim();
        const networkKey = tadig;
        
        if (uniqueNetworks.has(networkKey)) continue;
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

  async loadAllData(): Promise<NetworkPricing[]> {
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

  searchNetworks(query: string): NetworkPricing[] {
    const searchTerm = query.toLowerCase();
    return this.allData.filter(item =>
      item.country.toLowerCase().includes(searchTerm) ||
      item.network.toLowerCase().includes(searchTerm) ||
      item.tadig.toLowerCase().includes(searchTerm)
    );
  }

  getNetworkComparison(network: string, country: string): NetworkPricing[] {
    return this.allData.filter(item =>
      item.network.toLowerCase() === network.toLowerCase() &&
      item.country.toLowerCase() === country.toLowerCase()
    );
  }

  getAllData(): NetworkPricing[] {
    return this.allData;
  }
}