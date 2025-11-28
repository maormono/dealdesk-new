import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { MNOMapper } from './mnoMapper.js';

export interface OperatorPricing {
  tadig: string;
  country: string;
  operator: string;
  dataPerMB: number;
  currency: string;
  source: 'A1' | 'Telefonica' | 'Tele2';
  technologies?: string[];
  status?: string;
}

export class DataLoader {
  private data: OperatorPricing[] = [];
  private mnoMapper: MNOMapper;

  constructor() {
    this.mnoMapper = new MNOMapper();
  }

  async loadAllData(): Promise<OperatorPricing[]> {
    console.log('🔄 Loading operator data from files...');

    // Load MNO mappings first for name translation
    await this.mnoMapper.loadMappings();

    // Load A1 data
    await this.loadA1Data();

    // Load Telefonica data
    await this.loadTelefonicaData();

    // Load Tele2 data
    await this.loadTele2Data();

    console.log(`✅ Loaded ${this.data.length} total pricing records`);
    return this.data;
  }

  private async loadA1Data(): Promise<void> {
    const filePath = path.join(process.cwd(), '..', '202509_Country Price List A1 IMSI Sponsoring.xlsx');

    if (!fs.existsSync(filePath)) {
      console.warn('⚠️ A1 file not found:', filePath);
      return;
    }

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['prices A1 WS'];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    // Data starts at row 9 (index 8)
    for (let i = 8; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || !row[0]) continue;

      const tadig = row[4]?.toString().trim();
      if (!tadig) continue;

      const technologies = [];
      if (row[8] === 'Live') technologies.push('2G');
      if (row[10] === 'Live') technologies.push('3G');
      if (row[11] === 'Live') technologies.push('4G');
      if (row[12] === 'Live') technologies.push('5G');

      // Translate country and network names using MNO mapper
      const originalCountry = row[0]?.toString().trim() || '';
      const originalOperator = row[1]?.toString().trim() || '';
      const translated = this.mnoMapper.translate(tadig, originalCountry, originalOperator);

      this.data.push({
        tadig,
        country: translated.country,
        operator: translated.network,
        dataPerMB: parseFloat(row[27]) || 0,
        currency: row[23]?.toString().trim() || 'EUR',
        source: 'A1',
        technologies,
        status: 'active'
      });
    }

    console.log(`📊 Loaded ${this.data.filter(d => d.source === 'A1').length} A1 records`);
  }

  private async loadTelefonicaData(): Promise<void> {
    const filePath = path.join(process.cwd(), '..', '20250205 Monogoto TGS UK V1.xlsx');

    if (!fs.existsSync(filePath)) {
      console.warn('⚠️ Telefonica file not found:', filePath);
      return;
    }

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['Format All'];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    // Data starts at row 2 (index 1)
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || !row[0]) continue;

      const tadig = row[2]?.toString().trim();
      if (!tadig) continue;

      const technologies = [];
      if (row[17] === 'Live') technologies.push('2G');
      if (row[18] === 'Live') technologies.push('3G');
      if (row[19] === 'Live') technologies.push('4G');
      if (row[20] === 'Live') technologies.push('5G');

      // Translate country and network names using MNO mapper
      const originalCountry = row[0]?.toString().trim() || '';
      const originalOperator = row[1]?.toString().trim() || '';
      const translated = this.mnoMapper.translate(tadig, originalCountry, originalOperator);

      this.data.push({
        tadig,
        country: translated.country,
        operator: translated.network,
        dataPerMB: parseFloat(row[10]) || 0,
        currency: 'USD',
        source: 'Telefonica',
        technologies,
        status: 'active'
      });
    }

    console.log(`📊 Loaded ${this.data.filter(d => d.source === 'Telefonica').length} Telefonica records`);
  }

  private async loadTele2Data(): Promise<void> {
    const filePath = path.join(process.cwd(), '..', 'Tele2 data fee June-23 analysis.xlsx');

    if (!fs.existsSync(filePath)) {
      console.warn('⚠️ Tele2 file not found:', filePath);
      return;
    }

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['Cost DATA by customer'];

    if (!sheet) {
      console.warn('⚠️ Tele2 sheet not found');
      return;
    }

    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    // Data starts at row 2 (index 1)
    const uniqueTadigs = new Set<string>();

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || !row[0]) continue;

      const tadig = row[0]?.toString().trim();
      if (!tadig || uniqueTadigs.has(tadig)) continue;

      uniqueTadigs.add(tadig);

      // Translate country and network names using MNO mapper
      const originalCountry = row[2]?.toString().split(' - ')[1] || 'Unknown';
      const originalOperator = row[2]?.toString().trim() || '';
      const translated = this.mnoMapper.translate(tadig, originalCountry, originalOperator);

      this.data.push({
        tadig,
        country: translated.country,
        operator: translated.network,
        dataPerMB: parseFloat(row[7]) || 0,
        currency: 'USD',
        source: 'Tele2',
        technologies: ['4G', '3G'], // Default as not specified
        status: 'active'
      });
    }

    console.log(`📊 Loaded ${this.data.filter(d => d.source === 'Tele2').length} Tele2 records`);
  }

  searchByTadig(query: string): OperatorPricing[] {
    const searchTerm = query.toUpperCase();
    return this.data.filter(item => 
      item.tadig.toUpperCase().includes(searchTerm)
    );
  }

  getAllData(): OperatorPricing[] {
    return this.data;
  }

  getComparison(tadig: string): OperatorPricing[] {
    return this.data.filter(item => 
      item.tadig.toUpperCase() === tadig.toUpperCase()
    );
  }
}