import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

export interface MNOMapping {
  tadig: string;
  country: string;
  network: string;
}

/**
 * MNO Mapper Service
 *
 * Loads the master MNO names database and provides translation
 * from TADIG codes to standardized country and network names.
 *
 * Example: TADIG "ISR01" -> Country: "Israel", Network: "Partner"
 */
export class MNOMapper {
  private mappings: Map<string, MNOMapping> = new Map();

  /**
   * Load MNO mappings from the master Excel file
   */
  async loadMappings(): Promise<void> {
    const filePath = path.join(process.cwd(), '..', 'MNO names.xlsx');

    if (!fs.existsSync(filePath)) {
      console.warn('⚠️  MNO names file not found:', filePath);
      console.warn('⚠️  Network/country name translation will not be available');
      return;
    }

    try {
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      // Skip header row (index 0)
      let loadedCount = 0;
      let multiTadigNetworks = 0;

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || !row[2]) continue; // Skip if no TADIG

        const tadigCell = row[2]?.toString().trim();
        const country = row[0]?.toString().trim() || '';
        const network = row[1]?.toString().trim() || '';

        if (tadigCell && country && network) {
          // Handle multiple TADIGs separated by comma (e.g., "THAAS, THAWN")
          if (tadigCell.includes(',')) {
            const tadigList = tadigCell.split(',').map(t => t.trim().toUpperCase());
            tadigList.forEach(tadig => {
              if (tadig) {
                this.mappings.set(tadig, { tadig, country, network });
                loadedCount++;
              }
            });
            multiTadigNetworks++;
          } else {
            const tadig = tadigCell.toUpperCase();
            this.mappings.set(tadig, { tadig, country, network });
            loadedCount++;
          }
        }
      }

      console.log(`✅ Loaded ${loadedCount} MNO mappings from master database`);
      if (multiTadigNetworks > 0) {
        console.log(`   (${multiTadigNetworks} networks with multiple TADIGs)`);
      }
    } catch (error) {
      console.error('❌ Error loading MNO mappings:', error);
    }
  }

  /**
   * Get standardized country and network name for a TADIG code
   *
   * @param tadig - The TADIG code (e.g., "ISR01", "AUTPT")
   * @returns MNO mapping with standard country and network names, or null if not found
   *
   * @example
   * mapper.getMapping("ISR01")
   * // Returns: { tadig: "ISR01", country: "Israel", network: "Partner" }
   */
  getMapping(tadig: string): MNOMapping | null {
    if (!tadig) return null;

    const normalizedTadig = tadig.trim().toUpperCase();
    return this.mappings.get(normalizedTadig) || null;
  }

  /**
   * Translate network and country names using TADIG lookup
   * Falls back to original names if TADIG not found
   *
   * @param tadig - The TADIG code
   * @param originalCountry - Original country name from source file
   * @param originalNetwork - Original network name from source file
   * @returns Object with translated country and network names
   *
   * @example
   * mapper.translate("ISR01", "ISR", "Partner Communication Israel")
   * // Returns: { country: "Israel", network: "Partner" }
   */
  translate(tadig: string, originalCountry: string, originalNetwork: string): { country: string; network: string } {
    const mapping = this.getMapping(tadig);

    if (mapping) {
      return {
        country: mapping.country,
        network: mapping.network
      };
    }

    // Fallback to original names if TADIG not found
    return {
      country: originalCountry,
      network: originalNetwork
    };
  }

  /**
   * Get all available countries from the mappings
   */
  getAllCountries(): string[] {
    const countries = new Set<string>();
    this.mappings.forEach(mapping => {
      if (mapping.country) {
        countries.add(mapping.country);
      }
    });
    return Array.from(countries).sort();
  }

  /**
   * Get all networks for a specific country
   */
  getNetworksByCountry(country: string): string[] {
    const networks = new Set<string>();
    this.mappings.forEach(mapping => {
      if (mapping.country.toLowerCase() === country.toLowerCase()) {
        networks.add(mapping.network);
      }
    });
    return Array.from(networks).sort();
  }

  /**
   * Get total number of loaded mappings
   */
  getMappingCount(): number {
    return this.mappings.size;
  }
}
