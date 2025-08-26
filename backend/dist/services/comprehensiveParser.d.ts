export interface NetworkPricing {
    tadig: string;
    country: string;
    network: string;
    mccMnc?: string;
    imsiCost: number;
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
    currency: string;
    source: 'A1' | 'Telefonica' | 'Tele2';
    restrictions?: string;
    specialInstructions?: string;
    dataIncrement?: string;
    region?: string;
    group?: string;
    status?: string;
    closureDate2G?: string;
    closureDate3G?: string;
}
export declare class ComprehensiveParser {
    private allData;
    private tadigToNetwork;
    constructor();
    private initializeTadigMapping;
    private getFormalNetworkName;
    parseA1File(): Promise<NetworkPricing[]>;
    parseTelefonicaFile(): Promise<NetworkPricing[]>;
    parseTele2File(): Promise<NetworkPricing[]>;
    loadAllData(): Promise<NetworkPricing[]>;
    searchNetworks(query: string): NetworkPricing[];
    getNetworkComparison(network: string, country: string): NetworkPricing[];
    getAllData(): NetworkPricing[];
}
//# sourceMappingURL=comprehensiveParser.d.ts.map