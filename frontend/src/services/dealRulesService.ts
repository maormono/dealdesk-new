import { 
  evaluateDeal, 
  formatEvaluationForSales, 
  getDealRules,
  type DealRequest,
  type DealEvaluation 
} from '../utils/dealEvaluator';

export class DealRulesService {
  // Process user input and evaluate against rules
  async processUserQuery(query: string, existingDeal?: Partial<DealRequest>): Promise<string> {
    // Parse the query to extract deal parameters
    const dealRequest = this.parseQueryToDeal(query, existingDeal);
    
    if (!dealRequest) {
      return this.getHelpfulResponse(query);
    }
    
    // Evaluate the deal against current rules
    const evaluation = await evaluateDeal(dealRequest);
    
    // Format response for sales team (no costs shown)
    return formatEvaluationForSales(evaluation, dealRequest);
  }
  
  private parseQueryToDeal(query: string, existing?: Partial<DealRequest>): DealRequest | null {
    const deal: DealRequest = {
      simCount: 0,
      countries: [],
      dataRequirement: 0,
      isPackage: false,
      networkRedundancy: false,
      contractLength: 12
    };
    
    const lowerQuery = query.toLowerCase();
    
    // Parse SIM count
    const simMatch = lowerQuery.match(/(\d+)\s*(?:sim|sims|sim cards)/);
    if (simMatch) {
      deal.simCount = parseInt(simMatch[1]);
    } else if (existing?.simCount) {
      deal.simCount = existing.simCount;
    } else {
      return null; // Can't evaluate without SIM count
    }
    
    // Parse countries
    const countryPatterns = [
      /belgium|be\b/gi,
      /france|fr\b/gi,
      /uk|united kingdom|gb\b/gi,
      /germany|de\b/gi,
      /spain|es\b/gi,
      /italy|it\b/gi,
      /netherlands|nl\b/gi,
      /poland|pl\b/gi
    ];
    
    const countryMap: Record<string, string> = {
      'belgium': 'BE',
      'be': 'BE',
      'france': 'FR',
      'fr': 'FR',
      'uk': 'UK',
      'united kingdom': 'UK',
      'gb': 'UK',
      'germany': 'DE',
      'de': 'DE',
      'spain': 'ES',
      'es': 'ES',
      'italy': 'IT',
      'it': 'IT',
      'netherlands': 'NL',
      'nl': 'NL',
      'poland': 'PL',
      'pl': 'PL'
    };
    
    for (const pattern of countryPatterns) {
      const matches = lowerQuery.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const country = countryMap[match.toLowerCase()];
          if (country && !deal.countries.includes(country)) {
            deal.countries.push(country);
          }
        });
      }
    }
    
    if (deal.countries.length === 0 && existing?.countries) {
      deal.countries = existing.countries;
    }
    
    // Parse data requirement
    const dataMatch = lowerQuery.match(/(\d+(?:\.\d+)?)\s*(?:gb|gigabyte)/);
    if (dataMatch) {
      deal.dataRequirement = parseFloat(dataMatch[1]);
    } else if (lowerQuery.includes('1gb') || lowerQuery.includes('1 gb')) {
      deal.dataRequirement = 1;
    } else if (existing?.dataRequirement) {
      deal.dataRequirement = existing.dataRequirement;
    }
    
    // Check for package deal
    deal.isPackage = lowerQuery.includes('package') || lowerQuery.includes('bundle');
    
    // Check for network redundancy
    deal.networkRedundancy = lowerQuery.includes('two network') || 
                             lowerQuery.includes('dual network') || 
                             lowerQuery.includes('redundan') ||
                             lowerQuery.includes('failover');
    
    // Parse contract length
    const contractMatch = lowerQuery.match(/(\d+)\s*month/);
    if (contractMatch) {
      deal.contractLength = parseInt(contractMatch[1]);
    }
    
    return deal;
  }
  
  private getHelpfulResponse(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('help') || lowerQuery.includes('how')) {
      return `## How to Request a Deal Review

To evaluate your deal, please provide:
1. **Number of SIMs** (e.g., "1000 SIMs")
2. **Countries** (e.g., "Belgium, France, UK")
3. **Data requirement** (e.g., "1GB per month")
4. **Optional**: Network redundancy, contract length

**Example**: "I need 1000 SIMs for Belgium, France, and UK with 1GB per month and dual network redundancy"

I'll analyze profitability and provide pricing recommendations instantly.`;
    }
    
    if (lowerQuery.includes('price') || lowerQuery.includes('cost')) {
      return `## Pricing Information

Please provide your deal details and I'll calculate the recommended pricing based on:
- Volume discounts for your SIM quantity
- Country-specific network costs
- Data usage requirements
- Contract terms and redundancy needs

Our pricing ensures profitability while remaining competitive.`;
    }
    
    return `## Missing Deal Information

To evaluate this deal, I need:
- **Number of SIMs** required
- **Countries** where they'll operate
- **Monthly data** per SIM

Please provide these details for a complete analysis.`;
  }
}