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
export declare class DataLoader {
    private data;
    loadAllData(): Promise<OperatorPricing[]>;
    private loadA1Data;
    private loadTelefonicaData;
    private loadTele2Data;
    searchByTadig(query: string): OperatorPricing[];
    getAllData(): OperatorPricing[];
    getComparison(tadig: string): OperatorPricing[];
}
//# sourceMappingURL=dataLoader.d.ts.map