// List of data quality issues found and how to fix them:

const issues = {
  // 1. HTML entities in network/country names
  htmlEntities: [
    { find: '&amp;', replace: '&' },
    { find: '&lt;', replace: '<' },
    { find: '&gt;', replace: '>' },
  ],
  
  // 2. Countries that are actually network names or codes
  wrongCountries: {
    'ALBANIA': 'Albania',
    'BRACS': 'Brazil',
    'BRASP': 'Brazil', 
    'COMUNICAÇÕES PESSOAIS, S.A.': 'Portugal',
    'SERVIÇOS DE COMUNICAÇÕES E MULTIMÉDIA SA': 'Portugal',
    'MNGMN': 'Mongolia',
    'Algeria Telecom Mobile': 'Algeria',
  },
  
  // 3. Inconsistent country names (should be standardized)
  countryNormalization: {
    'Antigua & Barbuda': 'Antigua and Barbuda',
    'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
    'Congo, Democratic Republic of the': 'Democratic Republic of Congo',
    'Lao People\'s Democratic Republic': 'Laos',
    'St. Kitts & Nevis': 'Saint Kitts and Nevis',
    'St. Lucia': 'Saint Lucia',
    'St. Vincent & Grenadines': 'Saint Vincent and the Grenadines',
    'St. Vincent and the Grenadines': 'Saint Vincent and the Grenadines',
    'St. Vincent': 'Saint Vincent and the Grenadines',
    'Taiwan, Province of China': 'Taiwan',
    'Turks & Caicos': 'Turks and Caicos Islands',
    'Trinidad & Tobago': 'Trinidad and Tobago',
  },
  
  // 4. Network names with country prefix that should be removed
  networkPrefixesToClean: [
    'Argentina - ', 'Australia - ', 'Brazil - ', 'Canada - ',
    'Chile - ', 'China - ', 'Egypt - ', 'France - ',
    'Germany - ', 'India - ', 'Israel - ', 'Italy - ',
    'Japan - ', 'Mexico - ', 'Nigeria - ', 'Russia - ',
    'Saudi Arabia - ', 'South Africa - ', 'Spain - ',
    'United Kingdom - ', 'United States - '
  ],
  
  // 5. Very long network names that should be shortened
  longNetworkNames: {
    'Egyptian for Mobile Services (ECMS) MobiNil (Orange) (EGYAR)': 'MobiNil (Orange)',
    'Conecel S.A. (Consorcio Ecuatoriano de Telecomunicaciones S.A.)': 'Conecel',
    'AT&T Comercializacion Movil, S. de R.L. de C.V. MEXIU': 'AT&T Mexico',
    'Tunisian Mauritanian of Telecommunications (MATTEL)': 'Mattel',
  }
};

export default issues;