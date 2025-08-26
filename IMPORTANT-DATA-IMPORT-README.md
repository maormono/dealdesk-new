# ⚠️ CRITICAL: Data Import Instructions - READ BEFORE IMPORTING

## 🚨 DO NOT USE OLD IMPORT SCRIPTS WITHOUT READING THIS

### The Problem We Fixed
The original import scripts (`complete-network-import.py`, `batch-import.py`, etc.) have **CRITICAL BUGS** that cause:
1. **Country/Network name swapping** (e.g., CANST had network="Canada" and country="Unknown")
2. **Missing networks** due to incorrect parsing
3. **HTML entities** in names (e.g., "AT&amp;T" instead of "AT&T")
4. **Wrong country assignments** (e.g., "ALBANIA" as a country instead of "Albania")

### ✅ Use the Fixed Parser
**ALWAYS use the comprehensive parser** from `backend/src/services/comprehensiveParser.ts` which includes:
- Proper country/network field mapping
- HTML entity cleaning
- Country name normalization
- TADIG to country mapping for Tele2 data
- Preservation of important network names (e.g., "Canada - SaskTel")

### 📝 Known Issues That Were Fixed

#### 1. CANST (Canada SaskTel) Bug
- **Old parsing**: network_name="Canada", country="Unknown"
- **Fixed**: network_name="SaskTel" or "Canada - SaskTel", country="Canada"
- **Root cause**: Parser was stripping text after dash, removing actual network name

#### 2. Tele2 Unknown Countries (294 networks affected)
- **Old parsing**: 294 networks had country="Unknown"
- **Fixed**: Added TADIG prefix to country mapping
- **Example**: ISR01 now correctly shows country="Israel"

#### 3. HTML Entities
- **Old parsing**: "AT&amp;T", "CABLE &amp; WIRELESS"
- **Fixed**: Proper HTML entity decoding

#### 4. Country Name Standardization
- **Old**: Mixed formats like "St. Lucia", "St Lucia", "Saint Lucia"
- **Fixed**: Standardized to "Saint Lucia" format

### 🔧 How to Import Data Correctly

#### Option 1: Use the Fixed TypeScript Parser (RECOMMENDED)
```bash
# Use the comprehensive parser with all fixes
npx tsx import-with-fixed-parser.js
```

#### Option 2: Fix Existing Python Scripts
If you must use Python scripts, add these fixes:
```python
# WARNING: These scripts have bugs! See fixes below:

def fix_country_network_swap(tadig, country, network):
    """Fix the country/network swap issue"""
    # CANST specific fix
    if tadig == 'CANST':
        return 'Canada', 'SaskTel'  # or 'Canada - SaskTel'
    
    # Check if country looks like a network name
    if country in ['ALBANIA', 'BRACS', 'BRASP', 'MNGMN']:
        # These are network codes, not countries!
        country = get_country_from_tadig(tadig)
    
    return country, network

def clean_html_entities(text):
    """Clean HTML entities from text"""
    text = text.replace('&amp;', '&')
    text = text.replace('&lt;', '<')
    text = text.replace('&gt;', '>')
    return text

def get_country_from_tadig(tadig):
    """Map TADIG prefix to country for Tele2 data"""
    tadig_map = {
        'ISR': 'Israel',
        'CAN': 'Canada',
        'USA': 'United States',
        'GBR': 'United Kingdom',
        # ... add all mappings from comprehensiveParser.ts
    }
    prefix = tadig[:3]
    return tadig_map.get(prefix, 'Unknown')
```

### 🧪 Validation Checks After Import

Always verify these critical networks after import:
```sql
-- Check CANST is correct
SELECT * FROM networks WHERE tadig = 'CANST';
-- Should show: country='Canada', network_name='SaskTel' or 'Canada - SaskTel'

-- Check for Unknown countries
SELECT COUNT(*) FROM networks WHERE country = 'Unknown' OR country IS NULL;
-- Should be 0 or very few

-- Check for HTML entities
SELECT * FROM networks WHERE network_name LIKE '%&amp;%' OR country LIKE '%&amp;%';
-- Should return 0 rows
```

### 📊 Test Data Coverage
After import, you should have approximately:
- **Total networks**: ~1,291 (may vary with updates)
- **From A1**: ~464 networks
- **From Telefonica**: ~520 networks
- **From Tele2**: ~307 networks
- **Countries**: ~240+ unique countries
- **Networks with "Unknown" country**: 0 (or max 1-2 for special cases like Kosovo)

### 🚫 DO NOT:
1. **Do not** use regex to remove text after dashes (it removes network names)
2. **Do not** assume TADIG codes map 1:1 to network names
3. **Do not** parse Excel files directly without using the comprehensive parser
4. **Do not** ignore validation warnings after import

### ✅ DO:
1. **Always** use the comprehensive parser from TypeScript
2. **Always** validate critical networks after import (CANST, USAVZ, GBRCN, etc.)
3. **Always** check for "Unknown" countries and fix them
4. **Always** test with all three data sources (A1, Telefonica, Tele2)

### 🔍 Quick Diagnostic Commands

Check if your import has the bugs:
```bash
# Check CANST
curl -X GET "https://uddmjjgnexdazfedrytt.supabase.co/rest/v1/networks?tadig=eq.CANST" \
  -H "apikey: YOUR_SUPABASE_KEY"
# Should show country="Canada", not "Unknown"

# Count Unknown countries  
curl -X GET "https://uddmjjgnexdazfedrytt.supabase.co/rest/v1/networks?country=eq.Unknown&select=tadig" \
  -H "apikey: YOUR_SUPABASE_KEY"
# Should return empty or very few results
```

### 📝 Import Script Maintenance Log

| Date | Issue | Fix | Affected Networks |
|------|-------|-----|-------------------|
| 2024-01-21 | Country/Network swap | Fixed getFormalNetworkName() | CANST and others |
| 2024-01-21 | 294 Unknown countries | Added TADIG mapping | All Tele2 networks |
| 2024-01-21 | HTML entities | Added cleanHtmlEntities() | ~40 networks |
| 2024-01-21 | Country standardization | Added normalizeCountryName() | ~50 networks |

### 👨‍💻 Contact for Issues
If you encounter import issues:
1. Check this README first
2. Validate using the diagnostic commands above
3. Review the comprehensive parser at `backend/src/services/comprehensiveParser.ts`
4. Check git history for recent parser fixes

---
**Last Updated**: January 21, 2024
**Critical Networks to Always Verify**: CANST, USAVZ, GBRCN, DEUD2, ISRMS