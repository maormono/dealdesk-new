import { ComprehensiveParser } from './backend/src/services/comprehensiveParser';

async function analyzeDataQuality() {
  console.log('🔍 Analyzing Data Quality Issues...\n');
  
  const parser = new ComprehensiveParser();
  
  const a1Data = await parser.parseA1File();
  const telefonicaData = await parser.parseTelefonicaFile();
  const tele2Data = await parser.parseTele2File();
  
  const allData = [...a1Data, ...telefonicaData, ...tele2Data];
  
  // 1. Check for network names that look like countries
  console.log('=== NETWORK NAMES THAT LOOK LIKE COUNTRIES ===');
  const countryLikeNetworks = allData.filter(n => {
    const countries = [
      'United States', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'Chile',
      'United Kingdom', 'France', 'Germany', 'Spain', 'Italy', 'Portugal',
      'China', 'Japan', 'India', 'Australia', 'Russia', 'South Africa',
      'Egypt', 'Nigeria', 'Kenya', 'Israel', 'Saudi Arabia', 'Turkey'
    ];
    
    return countries.some(country => 
      n.network === country || 
      n.network.startsWith(country + ' ')
    );
  });
  
  if (countryLikeNetworks.length > 0) {
    console.log(`Found ${countryLikeNetworks.length} networks with country-like names:`);
    countryLikeNetworks.slice(0, 20).forEach(n => {
      console.log(`  ${n.tadig}: network="${n.network}", country="${n.country}"`);
    });
  }
  
  // 2. Check for weird/suspicious country names
  console.log('\n=== SUSPICIOUS COUNTRY NAMES ===');
  const suspiciousCountries = allData.filter(n => {
    const country = n.country?.toLowerCase() || '';
    return (
      country.includes('unknown') ||
      country.includes('test') ||
      country.includes('null') ||
      country.includes('undefined') ||
      country.includes('&amp;') ||
      country.includes('ltd') ||
      country.includes('inc') ||
      country.includes('.') ||
      country.length < 3 ||
      country.length > 50 ||
      /^\d+$/.test(country) || // All numbers
      /^[A-Z]{2,5}$/.test(n.country) // All caps abbreviation
    );
  });
  
  if (suspiciousCountries.length > 0) {
    console.log(`Found ${suspiciousCountries.length} suspicious country names:`);
    const uniqueSuspicious = new Set(suspiciousCountries.map(n => n.country));
    Array.from(uniqueSuspicious).forEach(country => {
      const examples = suspiciousCountries.filter(n => n.country === country).slice(0, 3);
      console.log(`  "${country}": ${examples.map(e => e.tadig).join(', ')}`);
    });
  }
  
  // 3. Check for weird network names
  console.log('\n=== SUSPICIOUS NETWORK NAMES ===');
  const suspiciousNetworks = allData.filter(n => {
    const network = n.network?.toLowerCase() || '';
    return (
      network.includes('unknown') ||
      network === 'test' ||
      network === 'null' ||
      network === 'undefined' ||
      network.includes('&amp;') || // HTML entities
      network.includes('&lt;') ||
      network.includes('&gt;') ||
      network.length < 2 ||
      network === '.' ||
      network === '-' ||
      /^\d+$/.test(network) // All numbers
    );
  });
  
  if (suspiciousNetworks.length > 0) {
    console.log(`Found ${suspiciousNetworks.length} suspicious network names:`);
    suspiciousNetworks.slice(0, 20).forEach(n => {
      console.log(`  ${n.tadig} (${n.source}): "${n.network}" in ${n.country}`);
    });
  }
  
  // 4. Check for potential data swaps (country in network field)
  console.log('\n=== POTENTIAL COUNTRY/NETWORK SWAPS ===');
  const possibleSwaps = allData.filter(n => {
    // Check if network contains " - Country" pattern
    const match = n.network?.match(/(.+)\s-\s([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    if (match && match[2]) {
      // Check if the second part looks like a country
      const possibleCountry = match[2];
      const countryList = ['Israel', 'Canada', 'United States', 'Germany', 'France', 
                          'Spain', 'Italy', 'Japan', 'China', 'India', 'Brazil',
                          'Mexico', 'Australia', 'Russia', 'South Africa'];
      return countryList.includes(possibleCountry);
    }
    return false;
  });
  
  if (possibleSwaps.length > 0) {
    console.log(`Found ${possibleSwaps.length} potential swaps:`);
    possibleSwaps.slice(0, 20).forEach(n => {
      console.log(`  ${n.tadig}: network="${n.network}", country="${n.country}"`);
    });
  }
  
  // 5. Check for HTML entities in data
  console.log('\n=== HTML ENTITIES IN DATA ===');
  const htmlEntities = allData.filter(n => 
    (n.network && n.network.includes('&')) || 
    (n.country && n.country.includes('&'))
  );
  
  if (htmlEntities.length > 0) {
    console.log(`Found ${htmlEntities.length} entries with HTML entities:`);
    htmlEntities.slice(0, 20).forEach(n => {
      console.log(`  ${n.tadig}: network="${n.network}", country="${n.country}"`);
    });
  }
  
  // 6. Check for very long names
  console.log('\n=== VERY LONG NAMES ===');
  const longNames = allData.filter(n => 
    (n.network && n.network.length > 50) || 
    (n.country && n.country.length > 30)
  );
  
  if (longNames.length > 0) {
    console.log(`Found ${longNames.length} entries with very long names:`);
    longNames.slice(0, 10).forEach(n => {
      if (n.network.length > 50) {
        console.log(`  ${n.tadig}: network="${n.network.substring(0, 60)}..."`);
      }
      if (n.country.length > 30) {
        console.log(`  ${n.tadig}: country="${n.country}"`);
      }
    });
  }
  
  // 7. Check for missing or empty data
  console.log('\n=== MISSING DATA ===');
  const missingData = allData.filter(n => 
    !n.tadig || n.tadig === '' ||
    !n.country || n.country === '' ||
    !n.network || n.network === ''
  );
  
  if (missingData.length > 0) {
    console.log(`Found ${missingData.length} entries with missing data:`);
    missingData.slice(0, 10).forEach(n => {
      const missing = [];
      if (!n.tadig) missing.push('TADIG');
      if (!n.country) missing.push('country');
      if (!n.network) missing.push('network');
      console.log(`  Missing ${missing.join(', ')}: ${n.tadig || 'NO_TADIG'}`);
    });
  }
  
  // 8. Check for duplicate network names in same country
  console.log('\n=== DUPLICATE NETWORKS IN SAME COUNTRY ===');
  const networkCountryPairs = new Map<string, string[]>();
  
  allData.forEach(n => {
    if (n.country && n.network) {
      const key = `${n.country}|${n.network}`;
      if (!networkCountryPairs.has(key)) {
        networkCountryPairs.set(key, []);
      }
      networkCountryPairs.get(key)!.push(n.tadig);
    }
  });
  
  const duplicates = Array.from(networkCountryPairs.entries())
    .filter(([_, tadigs]) => tadigs.length > 2)
    .sort((a, b) => b[1].length - a[1].length);
  
  if (duplicates.length > 0) {
    console.log(`Found ${duplicates.length} duplicate network/country combinations:`);
    duplicates.slice(0, 10).forEach(([key, tadigs]) => {
      const [country, network] = key.split('|');
      console.log(`  "${network}" in ${country}: ${tadigs.length} times (${tadigs.slice(0, 5).join(', ')})`);
    });
  }
  
  // 9. Check for special characters
  console.log('\n=== SPECIAL CHARACTERS ===');
  const specialChars = allData.filter(n => {
    const hasSpecial = (str: string) => /[<>{}[\]\\|`~!@#$%^*()+=]/.test(str);
    return (n.network && hasSpecial(n.network)) || (n.country && hasSpecial(n.country));
  });
  
  if (specialChars.length > 0) {
    console.log(`Found ${specialChars.length} entries with special characters:`);
    specialChars.slice(0, 10).forEach(n => {
      console.log(`  ${n.tadig}: network="${n.network}", country="${n.country}"`);
    });
  }
  
  // 10. Summary statistics
  console.log('\n=== SUMMARY STATISTICS ===');
  const countries = new Set(allData.map(n => n.country).filter(c => c));
  const networks = new Set(allData.map(n => n.network).filter(n => n));
  
  console.log(`Total entries: ${allData.length}`);
  console.log(`Unique countries: ${countries.size}`);
  console.log(`Unique network names: ${networks.size}`);
  console.log(`Average network name length: ${Math.round(
    allData.reduce((sum, n) => sum + (n.network?.length || 0), 0) / allData.length
  )} characters`);
  
  // List all unique countries to spot any obvious issues
  console.log('\n=== ALL UNIQUE COUNTRIES (first 50) ===');
  const sortedCountries = Array.from(countries).sort();
  sortedCountries.slice(0, 50).forEach(country => {
    const count = allData.filter(n => n.country === country).length;
    if (country.length > 30 || country.includes('&') || /[<>{}]/.test(country)) {
      console.log(`  ⚠️  "${country}" (${count} networks)`);
    } else {
      console.log(`  "${country}" (${count} networks)`);
    }
  });
}

analyzeDataQuality().catch(console.error);