export interface NetworkPricing {
    tadig: string;
    country: string;
    network: string;
    mccMnc?: string;
    imsiAccessFee: number;
    dataPerMB: number;
    smsOutgoing?: number;
    smsIncoming?: number;
    voiceOutgoing?: number;
    voiceIncoming?: number;
    gsm?: boolean;
    gprs2G?: boolean;
    umts3G?: boolean;
    lte4G?: boolean;
    lte5G?: boolean;
    lteM?: boolean;
    nbIot?: boolean;
    volte?: boolean;
    currency: string;
    source: 'A1' | 'Telefonica' | 'Tele2' | 'Invoice';
    restrictions?: string;
    specialNotes?: string;
    prohibitedNetwork?: boolean;
    noRoaming?: boolean;
    dataNotLaunched?: boolean;
    dataIncrement?: string;
    region?: string;
    group?: string;
    status?: string;
    closureDate2G?: string;
    closureDate3G?: string;
    lastUpdated?: Date;
}
export declare class SuperParser {
    private allNetworks;
    private restrictionNotes;
    constructor();
    private initializeKnownRestrictions;
    /**
     * Parse Monogoto Invoice with IMSI fees and restrictions
     */
    parseInvoiceFile(filePath: string): Promise<NetworkPricing[]>;
    /**
     * Parse A1 format with comprehensive technology and restriction data
     */
    parseA1File(filePath: string): Promise<NetworkPricing[]>;
    /**
     * Parse Telefonica format
     */
    parseTelefonicaFile(filePath: string): Promise<NetworkPricing[]>;
    /**
     * Parse Tele2 format (usage data, not pricing)
     */
    parseTele2File(filePath: string): Promise<NetworkPricing[]>;
    /**
     * Parse restriction text into structured flags
     */
    private parseRestrictions;
    /**
     * Parse number from various formats
     */
    private parseNumber;
    /**
     * Get merged pricing for a TADIG with source priority
     */
    getNetworkPricing(tadig: string): NetworkPricing | null;
    /**
     * Get all networks with specific restrictions
     */
    getRestrictedNetworks(): NetworkPricing[];
    /**
     * Get networks with IMSI fees
     */
    getNetworksWithIMSIFees(): NetworkPricing[];
    /**
     * Compare pricing between sources for a TADIG
     */
    comparePricing(tadig: string): {
        invoice?: NetworkPricing;
        a1?: NetworkPricing;
        telefonica?: NetworkPricing;
        tele2?: NetworkPricing;
        differences: string[];
    };
    /**
     * Export consolidated pricing to CSV
     */
    exportToCSV(filePath: string): void;
    /**
     * Get summary statistics
     */
    getSummary(): {
        totalNetworks: number;
        networksWithIMSI: number;
        prohibitedNetworks: number;
        averageDataRate: number;
        averageIMSIFee: number;
        bySource: {
            [key: string]: number;
        };
    };
}
export default SuperParser;
//# sourceMappingURL=superParser.d.ts.map