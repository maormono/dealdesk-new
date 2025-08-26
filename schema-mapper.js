// AI-Powered Schema Mapper for Price List Updates
// This module handles flexible schema detection and mapping

class SchemaMapper {
    constructor() {
        // Define patterns for column detection
        this.columnPatterns = {
            country: [
                /country/i,
                /nation/i,
                /location/i,
                /territory/i
            ],
            network: [
                /network/i,
                /operator/i,
                /carrier/i,
                /provider/i,
                /mnc/i
            ],
            tadig: [
                /tadig/i,
                /tadic/i,
                /network.*code/i,
                /operator.*code/i
            ],
            price: [
                /price/i,
                /rate/i,
                /cost/i,
                /data.*mb/i,
                /mb.*rate/i,
                /per.*mb/i
            ],
            imsi: [
                /imsi/i,
                /sim.*fee/i,
                /activation/i,
                /monthly.*fee/i
            ],
            technology: [
                /tech/i,
                /2g|3g|4g|5g/i,
                /generation/i,
                /capability/i
            ],
            currency: [
                /currency/i,
                /curr/i,
                /eur|usd|gbp/i
            ]
        };

        // Known operator-specific patterns
        this.operatorPatterns = {
            A1: {
                headerRow: [8, 9, 10], // Possible header rows
                dataStart: 10,
                identifiers: ['a1', 'austria', 'imsi sponsoring']
            },
            Telefonica: {
                headerRow: [0, 1, 2],
                dataStart: 2,
                identifiers: ['telefonica', 'monogoto', 'tgs']
            },
            Tele2: {
                headerRow: [0, 1],
                dataStart: 2,
                identifiers: ['tele2', 'data fee']
            }
        };
    }

    // Detect operator from file content
    detectOperator(rows) {
        const firstRows = rows.slice(0, 20).join(' ').toLowerCase();
        
        for (const [operator, pattern] of Object.entries(this.operatorPatterns)) {
            const found = pattern.identifiers.some(id => firstRows.includes(id));
            if (found) return operator;
        }
        
        return null;
    }

    // Find column by pattern matching
    findColumn(headerRow, patterns) {
        for (let i = 0; i < headerRow.length; i++) {
            const cell = String(headerRow[i] || '').trim();
            
            for (const pattern of patterns) {
                if (pattern.test(cell)) {
                    return i;
                }
            }
        }
        return -1;
    }

    // Detect TADIG column by pattern
    findTADIGColumn(rows) {
        // Look for cells matching TADIG pattern (3 letters + 2 numbers)
        const tadigPattern = /^[A-Z]{3}[0-9]{2}$/;
        
        for (let row = 0; row < Math.min(20, rows.length); row++) {
            const rowData = rows[row];
            if (!rowData) continue;
            
            for (let col = 0; col < rowData.length; col++) {
                const cell = String(rowData[col] || '').trim();
                if (tadigPattern.test(cell)) {
                    // Found a TADIG-like value, check if column has more
                    let matchCount = 0;
                    for (let checkRow = row; checkRow < Math.min(row + 10, rows.length); checkRow++) {
                        if (rows[checkRow] && tadigPattern.test(String(rows[checkRow][col] || '').trim())) {
                            matchCount++;
                        }
                    }
                    if (matchCount >= 3) {
                        return { column: col, startRow: row };
                    }
                }
            }
        }
        
        return { column: -1, startRow: -1 };
    }

    // Detect price column by finding numeric patterns
    findPriceColumn(rows, startRow) {
        const pricePattern = /^\d*\.?\d+$/;
        
        for (let col = 0; col < rows[startRow].length; col++) {
            let numericCount = 0;
            let total = 0;
            
            for (let row = startRow; row < Math.min(startRow + 20, rows.length); row++) {
                if (!rows[row]) continue;
                const cell = String(rows[row][col] || '').trim();
                
                if (pricePattern.test(cell)) {
                    numericCount++;
                    total += parseFloat(cell);
                }
            }
            
            // If column has mostly numbers in reasonable price range
            if (numericCount >= 10) {
                const avg = total / numericCount;
                if (avg > 0 && avg < 100) { // Reasonable price range
                    return col;
                }
            }
        }
        
        return -1;
    }

    // Main schema detection function
    async detectSchema(workbook, operatorHint = null) {
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        // Detect operator if not provided
        const operator = operatorHint || this.detectOperator(rows);
        
        // Find TADIG column (most reliable identifier)
        const tadigInfo = this.findTADIGColumn(rows);
        
        // Find header row
        let headerRow = -1;
        if (tadigInfo.startRow > 0) {
            // Check rows above TADIG data for headers
            for (let row = tadigInfo.startRow - 1; row >= Math.max(0, tadigInfo.startRow - 10); row--) {
                if (rows[row] && rows[row].some(cell => 
                    /country|network|operator|tadig|price|rate/i.test(String(cell || '')))) {
                    headerRow = row;
                    break;
                }
            }
        }
        
        // Build column mapping
        const mapping = {
            operator: operator,
            headerRow: headerRow,
            dataStartRow: tadigInfo.startRow,
            columns: {}
        };
        
        // Map columns based on header or position
        if (headerRow >= 0) {
            const headers = rows[headerRow];
            mapping.columns.country = this.findColumn(headers, this.columnPatterns.country);
            mapping.columns.network = this.findColumn(headers, this.columnPatterns.network);
            mapping.columns.tadig = tadigInfo.column;
            mapping.columns.price = this.findColumn(headers, this.columnPatterns.price);
            mapping.columns.imsi = this.findColumn(headers, this.columnPatterns.imsi);
            mapping.columns.currency = this.findColumn(headers, this.columnPatterns.currency);
        } else {
            // Fallback to position-based detection
            mapping.columns.tadig = tadigInfo.column;
            mapping.columns.price = this.findPriceColumn(rows, tadigInfo.startRow);
            
            // Guess other columns based on typical positions
            if (operator === 'A1') {
                mapping.columns.country = 2;
                mapping.columns.network = 3;
            } else if (operator === 'Telefonica') {
                mapping.columns.country = 0;
                mapping.columns.network = 1;
            } else if (operator === 'Tele2') {
                mapping.columns.network = 0;
                mapping.columns.country = 2;
            }
        }
        
        return mapping;
    }

    // Validate detected schema
    validateSchema(mapping, rows) {
        const issues = [];
        
        // Check if critical columns are found
        if (mapping.columns.tadig < 0) {
            issues.push({ level: 'error', message: 'TADIG column not found' });
        }
        
        if (mapping.columns.price < 0) {
            issues.push({ level: 'error', message: 'Price column not found' });
        }
        
        if (mapping.columns.network < 0 && mapping.columns.country < 0) {
            issues.push({ level: 'warning', message: 'Network or Country column not found' });
        }
        
        // Validate data samples
        if (mapping.dataStartRow >= 0 && mapping.dataStartRow < rows.length) {
            const sampleRows = rows.slice(mapping.dataStartRow, mapping.dataStartRow + 10);
            
            // Check TADIG format
            const tadigPattern = /^[A-Z]{3}[0-9]{2}$/;
            const invalidTadigs = sampleRows.filter(row => 
                row[mapping.columns.tadig] && 
                !tadigPattern.test(String(row[mapping.columns.tadig]).trim())
            );
            
            if (invalidTadigs.length > 0) {
                issues.push({ 
                    level: 'warning', 
                    message: `${invalidTadigs.length} rows with invalid TADIG format` 
                });
            }
            
            // Check price values
            const prices = sampleRows
                .map(row => parseFloat(row[mapping.columns.price]))
                .filter(p => !isNaN(p));
            
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            if (avgPrice > 10) {
                issues.push({ 
                    level: 'warning', 
                    message: 'Prices seem high - check if unit is correct (per MB vs per GB)' 
                });
            }
        }
        
        return {
            valid: issues.filter(i => i.level === 'error').length === 0,
            issues: issues
        };
    }

    // Parse data using detected schema
    parseWithSchema(rows, mapping) {
        const data = [];
        
        for (let i = mapping.dataStartRow; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row[mapping.columns.tadig]) continue;
            
            const record = {
                tadig: String(row[mapping.columns.tadig] || '').trim(),
                country: mapping.columns.country >= 0 ? 
                    String(row[mapping.columns.country] || '').trim() : '',
                network: mapping.columns.network >= 0 ? 
                    String(row[mapping.columns.network] || '').trim() : '',
                price: parseFloat(row[mapping.columns.price]) || 0,
                imsi: mapping.columns.imsi >= 0 ? 
                    parseFloat(row[mapping.columns.imsi]) || 0 : 0,
                currency: mapping.columns.currency >= 0 ? 
                    String(row[mapping.columns.currency] || 'USD').trim() : 'USD',
                source: mapping.operator
            };
            
            // Skip invalid records
            if (record.tadig && record.price > 0) {
                data.push(record);
            }
        }
        
        return data;
    }

    // Compare with existing data
    compareWithExisting(newData, existingData) {
        const changes = {
            new: [],
            updated: [],
            removed: [],
            unchanged: []
        };
        
        // Create lookup maps
        const newMap = new Map(newData.map(d => [d.tadig, d]));
        const existingMap = new Map(existingData.map(d => [d.tadig, d]));
        
        // Find new and updated
        for (const [tadig, newRecord] of newMap) {
            if (!existingMap.has(tadig)) {
                changes.new.push(newRecord);
            } else {
                const existing = existingMap.get(tadig);
                const priceDiff = Math.abs(newRecord.price - existing.price);
                
                if (priceDiff > 0.0001) {
                    changes.updated.push({
                        ...newRecord,
                        oldPrice: existing.price,
                        priceChange: ((newRecord.price - existing.price) / existing.price * 100).toFixed(2)
                    });
                } else {
                    changes.unchanged.push(newRecord);
                }
            }
        }
        
        // Find removed
        for (const [tadig, existing] of existingMap) {
            if (!newMap.has(tadig)) {
                changes.removed.push(existing);
            }
        }
        
        return changes;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SchemaMapper;
}