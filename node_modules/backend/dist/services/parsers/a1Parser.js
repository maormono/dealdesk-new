import * as XLSX from 'xlsx';
import { z } from 'zod';
const PricingRecordSchema = z.object({
    country: z.string(),
    countryCode: z.string(),
    operator: z.string(),
    tadigCode: z.string(),
    technologies: z.array(z.string()),
    imsiCost: z.number(),
    dataCostPerMB: z.number(),
    smsCost: z.number(),
    voiceCostPerMin: z.number(),
    currency: z.string(),
});
export class A1Parser {
    workbook = null;
    async parseFile(buffer) {
        try {
            this.workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = this.workbook.SheetNames[0];
            const worksheet = this.workbook.Sheets[sheetName];
            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            // Find header row (looking for specific A1 format columns)
            const headerRowIndex = this.findHeaderRow(jsonData);
            if (headerRowIndex === -1) {
                throw new Error('Could not find header row in A1 format file');
            }
            const headers = jsonData[headerRowIndex];
            const columnMap = this.mapColumns(headers);
            const records = [];
            // Parse data rows
            for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0)
                    continue;
                try {
                    const record = this.parseRow(row, columnMap);
                    if (record) {
                        records.push(record);
                    }
                }
                catch (error) {
                    console.warn(`Skipping row ${i + 1}: ${error}`);
                }
            }
            return records;
        }
        catch (error) {
            throw new Error(`Failed to parse A1 format file: ${error}`);
        }
    }
    findHeaderRow(data) {
        // Look for common A1 header patterns
        const headerPatterns = [
            'country',
            'operator',
            'tadig',
            'imsi',
            'data',
            'sms',
            'voice',
            'network'
        ];
        for (let i = 0; i < Math.min(data.length, 10); i++) {
            const row = data[i];
            if (!row)
                continue;
            const rowText = row.join(' ').toLowerCase();
            const matchCount = headerPatterns.filter(pattern => rowText.includes(pattern)).length;
            if (matchCount >= 4) {
                return i;
            }
        }
        return -1;
    }
    mapColumns(headers) {
        const columnMap = new Map();
        headers.forEach((header, index) => {
            const normalized = header?.toString().toLowerCase().trim() || '';
            // Map A1 specific column names
            if (normalized.includes('country')) {
                columnMap.set('country', index);
            }
            else if (normalized.includes('iso') || normalized.includes('country code')) {
                columnMap.set('countryCode', index);
            }
            else if (normalized.includes('operator') || normalized.includes('network')) {
                columnMap.set('operator', index);
            }
            else if (normalized.includes('tadig')) {
                columnMap.set('tadig', index);
            }
            else if (normalized.includes('technology') || normalized.includes('rat') || normalized.includes('2g') || normalized.includes('3g') || normalized.includes('4g') || normalized.includes('5g')) {
                columnMap.set('technology', index);
            }
            else if (normalized.includes('imsi') && normalized.includes('cost')) {
                columnMap.set('imsiCost', index);
            }
            else if (normalized.includes('data') && (normalized.includes('mb') || normalized.includes('cost'))) {
                columnMap.set('dataCost', index);
            }
            else if (normalized.includes('sms') && normalized.includes('cost')) {
                columnMap.set('smsCost', index);
            }
            else if (normalized.includes('voice') && (normalized.includes('min') || normalized.includes('cost'))) {
                columnMap.set('voiceCost', index);
            }
            else if (normalized.includes('currency')) {
                columnMap.set('currency', index);
            }
        });
        return columnMap;
    }
    parseRow(row, columnMap) {
        const getValue = (key) => {
            const index = columnMap.get(key);
            return index !== undefined ? row[index] : undefined;
        };
        const country = this.cleanString(getValue('country'));
        const operator = this.cleanString(getValue('operator'));
        const tadigCode = this.cleanString(getValue('tadig'));
        if (!country || !operator) {
            return null;
        }
        // Extract technologies
        const techValue = getValue('technology');
        const technologies = this.parseTechnologies(techValue);
        // Parse costs
        const imsiCost = this.parseNumber(getValue('imsiCost'));
        const dataCost = this.parseNumber(getValue('dataCost'));
        const smsCost = this.parseNumber(getValue('smsCost'));
        const voiceCost = this.parseNumber(getValue('voiceCost'));
        // Get or default currency
        const currency = this.cleanString(getValue('currency')) || 'EUR';
        // Extract country code from country name or use default
        const countryCode = this.cleanString(getValue('countryCode')) || this.extractCountryCode(country);
        return {
            country,
            countryCode,
            operator,
            tadigCode: tadigCode || this.generateTadigCode(country, operator),
            technologies,
            imsiCost,
            dataCostPerMB: dataCost,
            smsCost,
            voiceCostPerMin: voiceCost,
            currency,
        };
    }
    cleanString(value) {
        if (!value)
            return '';
        return value.toString().trim();
    }
    parseNumber(value) {
        if (!value)
            return 0;
        const cleaned = value.toString().replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    }
    parseTechnologies(value) {
        const technologies = [];
        if (!value)
            return ['4G']; // Default
        const techString = value.toString().toUpperCase();
        if (techString.includes('5G'))
            technologies.push('5G');
        if (techString.includes('4G') || techString.includes('LTE'))
            technologies.push('4G');
        if (techString.includes('3G') || techString.includes('UMTS'))
            technologies.push('3G');
        if (techString.includes('2G') || techString.includes('GSM'))
            technologies.push('2G');
        return technologies.length > 0 ? technologies : ['4G'];
    }
    extractCountryCode(country) {
        // Simple country to ISO code mapping (subset)
        const countryMap = {
            'austria': 'AT',
            'germany': 'DE',
            'switzerland': 'CH',
            'italy': 'IT',
            'france': 'FR',
            'spain': 'ES',
            'united kingdom': 'GB',
            'uk': 'GB',
            'united states': 'US',
            'usa': 'US',
            'netherlands': 'NL',
            'belgium': 'BE',
            'poland': 'PL',
            'czech republic': 'CZ',
            'slovakia': 'SK',
            'hungary': 'HU',
            'romania': 'RO',
            'bulgaria': 'BG',
            'greece': 'GR',
            'portugal': 'PT',
            'sweden': 'SE',
            'norway': 'NO',
            'denmark': 'DK',
            'finland': 'FI',
        };
        const normalized = country.toLowerCase();
        return countryMap[normalized] || country.substring(0, 2).toUpperCase();
    }
    generateTadigCode(country, operator) {
        // Generate a placeholder TADIG code
        const countryPrefix = country.substring(0, 3).toUpperCase();
        const operatorPrefix = operator.substring(0, 2).toUpperCase();
        return `${countryPrefix}${operatorPrefix}`;
    }
}
//# sourceMappingURL=a1Parser.js.map