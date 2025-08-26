import { z } from 'zod';
declare const PricingRecordSchema: any;
export type PricingRecord = z.infer<typeof PricingRecordSchema>;
export declare class A1Parser {
    private workbook;
    parseFile(buffer: Buffer): Promise<PricingRecord[]>;
    private findHeaderRow;
    private mapColumns;
    private parseRow;
    private cleanString;
    private parseNumber;
    private parseTechnologies;
    private extractCountryCode;
    private generateTadigCode;
}
export {};
//# sourceMappingURL=a1Parser.d.ts.map