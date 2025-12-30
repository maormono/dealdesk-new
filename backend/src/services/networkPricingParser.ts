import XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

export interface NetworkPricingRecord {
  country: string;
  network: string;
  tadig: string;
  identity: string; // B = Billing, O = Other
  source: string;
  dataPerMB: number;
  smsOutgoing: number;
  imsiCost: number;
  gsm: boolean;      // 2G
  gprs2G: boolean;   // 2G
  umts3G: boolean;   // 3G
  lte4G: boolean;    // 4G
  lte5G: boolean;    // 5G
  lteM: boolean;     // LTE-M
  lteMDouble: boolean; // LTE-M with double checkmark (✓✓)
  nbIot: boolean;    // NB-IoT
  nbIotDouble: boolean; // NB-IoT with double checkmark (✓✓)
  restrictions: string;
}

export class NetworkPricingParser {

  async loadData(): Promise<NetworkPricingRecord[]> {
    const filePath = path.join(process.cwd(), '..', 'network-pricing-2025-12-30.xlsx');

    if (!fs.existsSync(filePath)) {
      console.error('❌ Network pricing file not found:', filePath);
      return [];
    }

    console.log('📂 Loading network pricing from:', filePath);

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['Network Pricing'];

    if (!sheet) {
      console.error('❌ Sheet "Network Pricing" not found');
      return [];
    }

    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    const records: NetworkPricingRecord[] = [];

    // Track current country/network/tadig for continuation rows
    let currentCountry = '';
    let currentNetwork = '';
    let currentTadig = '';

    // Skip header row, start from row 2 (index 1)
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      // Update current values if present (non-empty)
      if (row[0] && String(row[0]).trim()) {
        currentCountry = String(row[0]).trim();
      }
      if (row[1] && String(row[1]).trim()) {
        currentNetwork = String(row[1]).trim();
      }
      if (row[2] && String(row[2]).trim()) {
        currentTadig = String(row[2]).trim();
      }

      const identity = row[3] ? String(row[3]).trim() : '';

      // Skip if no identity (invalid row)
      if (!identity) continue;

      // Parse prices (remove $ and convert to number)
      const dataPrice = this.parsePrice(row[4]);
      const smsPrice = this.parsePrice(row[5]);
      const imsiPrice = this.parsePrice(row[6]);

      // Parse technology checkmarks
      const has2G = this.hasCheckmark(row[7]);
      const has3G = this.hasCheckmark(row[8]);
      const has4G = this.hasCheckmark(row[9]);
      const has5G = this.hasCheckmark(row[10]);
      const hasLteM = this.hasCheckmark(row[11]);
      const hasLteMDouble = this.hasDoubleCheckmark(row[11]);
      const hasNbIot = this.hasCheckmark(row[12]);
      const hasNbIotDouble = this.hasDoubleCheckmark(row[12]);

      const comments = row[13] ? String(row[13]).trim() : '';

      // Determine source based on identity
      const source = identity === 'B' ? 'Monogoto-B' : 'Monogoto-O';

      records.push({
        country: currentCountry,
        network: currentNetwork,
        tadig: currentTadig,
        identity,
        source,
        dataPerMB: dataPrice,
        smsOutgoing: smsPrice,
        imsiCost: imsiPrice,
        gsm: has2G,
        gprs2G: has2G,
        umts3G: has3G,
        lte4G: has4G,
        lte5G: has5G,
        lteM: hasLteM,
        lteMDouble: hasLteMDouble,
        nbIot: hasNbIot,
        nbIotDouble: hasNbIotDouble,
        restrictions: comments
      });
    }

    console.log(`✅ Loaded ${records.length} network pricing records`);
    return records;
  }

  private parsePrice(value: any): number {
    if (!value || value === '-' || value === '') return 0;

    const strValue = String(value).trim();
    // Remove $ sign and any other non-numeric characters except . and -
    const numericStr = strValue.replace(/[^0-9.\-]/g, '');
    const parsed = parseFloat(numericStr);

    return isNaN(parsed) ? 0 : parsed;
  }

  private hasCheckmark(value: any): boolean {
    if (!value) return false;
    const strValue = String(value).trim();
    // Check for checkmark symbols or variations
    return strValue.includes('✓') || strValue.includes('✔') || strValue.toLowerCase() === 'yes' || strValue === '1';
  }

  private hasDoubleCheckmark(value: any): boolean {
    if (!value) return false;
    const strValue = String(value).trim();
    // Check for double checkmark (✓✓ or ✔✔)
    return strValue.includes('✓✓') || strValue.includes('✔✔') || strValue === '2';
  }
}
