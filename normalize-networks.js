// Network Name Normalization and Intelligence

// Known network rebrands and mergers
const NETWORK_REBRANDS = {
    // Israel
    'Orange': 'Partner',  // Orange Israel became Partner
    'Mirs': 'Hot Mobile',  // Mirs became Hot Mobile
    'Mirs Communications': 'Hot Mobile',
    
    // Global rebrands
    'France Telecom': 'Orange',
    'Cingular': 'AT&T',
    'GTE': 'Verizon',
    'Airtel': 'Bharti Airtel',
    'Hutch': 'Vodafone',
    'T-Mobile UK': 'EE',  // Merged with Orange UK to form EE
    'Orange UK': 'EE',
    
    // Standardizations
    'Vodafone Group': 'Vodafone',
    'Deutsche Telekom': 'T-Mobile',  // For consistency in branding
    'Telefonica': 'Movistar',  // Consumer brand
    'America Movil': 'Claro',
};

// Corporate suffixes to remove
const CORPORATE_SUFFIXES = [
    'Ltd.', 'Ltd', 'Limited',
    'Inc.', 'Inc', 'Incorporated', 
    'Corp.', 'Corp', 'Corporation',
    'Co.', 'Co', 'Company',
    'S.A.', 'SA', 'S.A.R.L.', 'SARL',
    'PLC', 'Plc', 'plc',
    'LLC', 'L.L.C.',
    'AG', 'A.G.',
    'GmbH', 'mbH',
    'B.V.', 'BV', 'N.V.', 'NV',
    'Pty', 'Proprietary',
    'Communications', 'Telecommunications', 
    'Telecom', 'Telekom', 'Telco',
    'Mobile', 'Cellular', 'Wireless',
    'Services', 'Service',
    'Holdings', 'Group',
    'International', 'National',
];

// Country-specific naming patterns
const COUNTRY_PATTERNS = {
    'Israel': {
        'Cellcom': 'Cellcom',
        'Partner': 'Partner (Orange)',  // Show previous brand
        'Pelephone': 'Pelephone',
        'Hot': 'Hot Mobile (Mirs)',  // Show previous brand
    },
    'United States': {
        'AT&T': 'AT&T',
        'Verizon': 'Verizon',
        'T-Mobile': 'T-Mobile',
        'Sprint': 'Sprint (T-Mobile)',  // Merged with T-Mobile
    }
};

function normalizeNetworkName(rawName, country, allVariations = []) {
    if (!rawName) return 'Unknown';
    
    let name = rawName;
    
    // Step 1: Remove country prefix if it matches
    if (country && name.toLowerCase().startsWith(country.toLowerCase() + ' - ')) {
        name = name.substring(country.length + 3);
    }
    
    // Step 2: Clean up basic formatting
    name = name.trim()
        .replace(/\s+/g, ' ')  // Multiple spaces to single
        .replace(/[,;]/g, '')  // Remove commas and semicolons
        .replace(/\(.+?\)/g, ''); // Remove content in parentheses temporarily
    
    // Step 3: Extract core brand name (before corporate suffixes)
    let coreName = name;
    const words = name.split(' ');
    
    // Find where corporate suffixes start
    for (let i = 0; i < words.length; i++) {
        const remainingPhrase = words.slice(i).join(' ');
        for (const suffix of CORPORATE_SUFFIXES) {
            if (remainingPhrase.toLowerCase().startsWith(suffix.toLowerCase())) {
                coreName = words.slice(0, i).join(' ');
                break;
            }
        }
    }
    
    // Step 4: Remove standalone corporate words
    for (const suffix of CORPORATE_SUFFIXES) {
        const regex = new RegExp(`\\b${suffix.replace('.', '\\.')}\\b`, 'gi');
        coreName = coreName.replace(regex, '');
    }
    
    coreName = coreName.trim();
    
    // Step 5: Apply known rebrands
    for (const [oldName, newName] of Object.entries(NETWORK_REBRANDS)) {
        if (coreName.toLowerCase().includes(oldName.toLowerCase())) {
            coreName = newName;
            break;
        }
    }
    
    // Step 6: Handle special cases based on variations
    if (allVariations.length > 1) {
        // Find the shortest clean name as likely the brand name
        const cleanVariations = allVariations
            .map(v => normalizeBasic(v))
            .filter(v => v && v.length > 0)
            .sort((a, b) => a.length - b.length);
        
        // Don't use super short names (like single letters)
        const validName = cleanVariations.find(v => v.length > 2);
        if (validName && validName.length < coreName.length) {
            coreName = validName;
        }
        
        // Check for notable old names to add in parentheses
        const hasOrange = allVariations.some(v => v.toLowerCase().includes('orange'));
        const hasPartner = allVariations.some(v => v.toLowerCase().includes('partner'));
        if (hasOrange && hasPartner) {
            coreName = 'Partner (Orange)';
        }
        
        const hasMirs = allVariations.some(v => v.toLowerCase().includes('mirs'));
        const hasHot = allVariations.some(v => v.toLowerCase().includes('hot'));
        if (hasMirs && hasHot) {
            coreName = 'Hot Mobile (Mirs)';
        }
    }
    
    // Step 7: Final cleanup
    coreName = coreName.trim().replace(/\s+/g, ' ');
    
    // Step 8: Capitalize properly and handle special cases
    // Special handling for known single-letter cases
    if (coreName.length === 1) {
        const letterMap = {
            'T': 'T-Mobile',
            'O': 'Orange',
            'V': 'Vodafone',
            'A': 'AT&T'
        };
        coreName = letterMap[coreName.toUpperCase()] || coreName;
    }
    
    coreName = coreName.split(' ')
        .map(word => {
            // Keep acronyms in caps
            if (word === word.toUpperCase() && word.length <= 4) {
                return word;
            }
            // Otherwise title case
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
    
    return coreName || rawName;
}

function normalizeBasic(name) {
    if (!name) return '';
    
    let cleaned = name;
    
    // Remove country prefixes
    cleaned = cleaned.replace(/^[A-Za-z\s]+ - /, '');
    
    // Remove corporate suffixes
    for (const suffix of CORPORATE_SUFFIXES) {
        const regex = new RegExp(`\\b${suffix.replace('.', '\\.')}\\b`, 'gi');
        cleaned = cleaned.replace(regex, '');
    }
    
    return cleaned.trim();
}

// Group networks by TADIG and normalize names
function processNetworkData(data) {
    const tadigGroups = {};
    
    data.forEach(item => {
        if (!tadigGroups[item.tadig]) {
            tadigGroups[item.tadig] = {
                tadig: item.tadig,
                country: item.country,
                variations: [],
                sources: []
            };
        }
        
        tadigGroups[item.tadig].sources.push(item);
        
        if (!tadigGroups[item.tadig].variations.includes(item.network)) {
            tadigGroups[item.tadig].variations.push(item.network);
        }
    });
    
    // Process each group
    return Object.values(tadigGroups).map(group => {
        // Normalize the network name using all variations
        const primaryName = normalizeNetworkName(
            group.variations[0], 
            group.country,
            group.variations
        );
        
        // Calculate pricing
        const prices = group.sources.map(s => {
            const rate = s.currency === 'EUR' ? 1.1 : s.currency === 'GBP' ? 1.25 : 1;
            return { ...s, priceUSD: s.dataPerMB * rate };
        });
        
        const bestPrice = Math.min(...prices.map(p => p.priceUSD));
        const worstPrice = Math.max(...prices.map(p => p.priceUSD));
        
        return {
            ...group,
            networkName: primaryName,
            originalNames: group.variations,
            bestPrice,
            worstPrice,
            hasImsi: group.sources.some(s => s.imsiCost > 0),
            searchText: `${group.country} ${primaryName} ${group.variations.join(' ')} ${group.tadig}`.toLowerCase()
        };
    });
}

// Optional: AI-powered name resolution (requires API key)
async function enhanceWithAI(networkName, country) {
    // This would call Gemini or another AI API
    // For now, returning a promise that resolves to the input
    
    const prompt = `What is the current official name of the mobile network operator 
                    previously or currently known as "${networkName}" in ${country}? 
                    Return only the current brand name, no explanation.`;
    
    // Placeholder for actual API call
    // const response = await fetch('https://api.gemini.ai/...', { ... });
    
    return networkName;  // Placeholder
}

// Export for use in HTML
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { normalizeNetworkName, processNetworkData };
}