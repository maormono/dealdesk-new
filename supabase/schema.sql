-- Supabase Schema for DealDesk Multi-Source Pricing
-- Handles pricing from A1, Telefonica, Tele2 (Invoice) with proper source tracking

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================
-- CORE TABLES
-- =====================================

-- Networks/Operators Master Table
CREATE TABLE networks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tadig VARCHAR(10) UNIQUE NOT NULL,
    network_name VARCHAR(255) NOT NULL,
    country VARCHAR(100) NOT NULL,
    mcc_mnc VARCHAR(10),
    region VARCHAR(100),
    operator_group VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_networks_tadig (tadig),
    INDEX idx_networks_country (country)
);

-- Pricing Sources
CREATE TABLE pricing_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_name VARCHAR(50) NOT NULL UNIQUE, -- 'A1', 'Telefonica', 'Tele2'
    description TEXT,
    currency VARCHAR(3) DEFAULT 'EUR',
    last_import_date DATE,
    file_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default sources
INSERT INTO pricing_sources (source_name, description, currency) VALUES
    ('A1', 'A1 Telekom Austria pricing', 'EUR'),
    ('Telefonica', 'Telefonica wholesale pricing', 'USD'),
    ('Tele2', 'Tele2 pricing from invoice', 'EUR');

-- =====================================
-- PRICING DATA
-- =====================================

-- Network Pricing by Source
CREATE TABLE network_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    network_id UUID REFERENCES networks(id) ON DELETE CASCADE,
    source_id UUID REFERENCES pricing_sources(id) ON DELETE CASCADE,
    
    -- Pricing fields
    data_per_mb DECIMAL(10, 6),
    sms_mo DECIMAL(10, 6),      -- SMS outgoing
    sms_mt DECIMAL(10, 6),      -- SMS incoming
    voice_moc DECIMAL(10, 6),   -- Voice outgoing
    voice_mtc DECIMAL(10, 6),   -- Voice incoming
    volte_per_mb DECIMAL(10, 6),
    
    -- IMSI/Access Fee (IMPORTANT: This varies by source!)
    imsi_access_fee DECIMAL(10, 4) DEFAULT 0,  -- Monthly fee in EUR
    
    -- Technology capabilities
    gsm BOOLEAN DEFAULT false,
    gprs_2g BOOLEAN DEFAULT false,
    umts_3g BOOLEAN DEFAULT false,
    lte_4g BOOLEAN DEFAULT false,
    lte_5g BOOLEAN DEFAULT false,
    lte_m BOOLEAN DEFAULT false,
    nb_iot BOOLEAN DEFAULT false,
    volte BOOLEAN DEFAULT false,
    
    -- Metadata
    effective_date DATE,
    expiry_date DATE,
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one price per network per source
    UNIQUE(network_id, source_id, effective_date),
    INDEX idx_pricing_network (network_id),
    INDEX idx_pricing_source (source_id)
);

-- Network Restrictions
CREATE TABLE network_restrictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    network_id UUID REFERENCES networks(id) ON DELETE CASCADE,
    source_id UUID REFERENCES pricing_sources(id),
    
    restriction_type VARCHAR(50) NOT NULL, -- 'prohibited', 'no_roaming', 'data_not_launched', 'no_resell'
    description TEXT,
    applies_from DATE,
    applies_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_restrictions_network (network_id),
    INDEX idx_restrictions_type (restriction_type)
);

-- Special Notes/Comments
CREATE TABLE network_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    network_id UUID REFERENCES networks(id) ON DELETE CASCADE,
    source_id UUID REFERENCES pricing_sources(id),
    
    note_type VARCHAR(50), -- 'access_fee', 'restriction', 'general'
    note_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================
-- VIEWS FOR EASY QUERYING
-- =====================================

-- Combined pricing view with all sources
CREATE VIEW v_network_pricing_all AS
SELECT 
    n.tadig,
    n.network_name,
    n.country,
    n.region,
    ps.source_name,
    ps.currency,
    np.data_per_mb,
    np.imsi_access_fee,
    np.sms_mo,
    np.voice_moc,
    np.lte_4g,
    np.lte_5g,
    np.volte,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM network_restrictions nr 
            WHERE nr.network_id = n.id 
            AND nr.restriction_type = 'prohibited' 
            AND nr.is_active = true
        ) THEN true 
        ELSE false 
    END as is_prohibited,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM network_restrictions nr 
            WHERE nr.network_id = n.id 
            AND nr.restriction_type = 'no_roaming' 
            AND nr.is_active = true
        ) THEN true 
        ELSE false 
    END as no_roaming,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM network_restrictions nr 
            WHERE nr.network_id = n.id 
            AND nr.restriction_type = 'data_not_launched' 
            AND nr.is_active = true
        ) THEN true 
        ELSE false 
    END as data_not_launched
FROM networks n
LEFT JOIN network_pricing np ON n.id = np.network_id
LEFT JOIN pricing_sources ps ON np.source_id = ps.id
WHERE np.is_current = true;

-- Australia-specific view (for testing)
CREATE VIEW v_australia_pricing AS
SELECT * FROM v_network_pricing_all
WHERE tadig LIKE 'AUS%'
ORDER BY tadig, source_name;

-- Networks with IMSI fees by source
CREATE VIEW v_networks_with_imsi_fees AS
SELECT 
    n.tadig,
    n.network_name,
    n.country,
    ps.source_name,
    np.imsi_access_fee
FROM networks n
JOIN network_pricing np ON n.id = np.network_id
JOIN pricing_sources ps ON np.source_id = ps.id
WHERE np.imsi_access_fee > 0
AND np.is_current = true
ORDER BY np.imsi_access_fee DESC;

-- =====================================
-- FUNCTIONS
-- =====================================

-- Function to get pricing comparison for a specific TADIG
CREATE OR REPLACE FUNCTION get_pricing_comparison(p_tadig VARCHAR)
RETURNS TABLE (
    source_name VARCHAR,
    data_per_mb DECIMAL,
    imsi_access_fee DECIMAL,
    is_prohibited BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.source_name,
        np.data_per_mb,
        np.imsi_access_fee,
        EXISTS (
            SELECT 1 FROM network_restrictions nr 
            WHERE nr.network_id = n.id 
            AND nr.restriction_type = 'prohibited' 
            AND nr.is_active = true
        ) as is_prohibited
    FROM networks n
    JOIN network_pricing np ON n.id = np.network_id
    JOIN pricing_sources ps ON np.source_id = ps.id
    WHERE n.tadig = p_tadig
    AND np.is_current = true;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- IMPORT TRACKING
-- =====================================

-- Track import history
CREATE TABLE import_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES pricing_sources(id),
    file_name VARCHAR(255),
    records_imported INTEGER,
    records_updated INTEGER,
    records_failed INTEGER,
    import_status VARCHAR(50), -- 'success', 'partial', 'failed'
    error_log TEXT,
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    imported_by VARCHAR(255)
);

-- =====================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================

ALTER TABLE networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_restrictions ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth setup)
CREATE POLICY "Enable read access for all users" ON networks
    FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON network_pricing
    FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON network_restrictions
    FOR SELECT USING (true);

-- =====================================
-- INDEXES FOR PERFORMANCE
-- =====================================

CREATE INDEX idx_pricing_imsi_fee ON network_pricing(imsi_access_fee) 
    WHERE imsi_access_fee > 0;

CREATE INDEX idx_pricing_data_rate ON network_pricing(data_per_mb);

CREATE INDEX idx_restrictions_active ON network_restrictions(is_active) 
    WHERE is_active = true;

-- =====================================
-- EXAMPLE QUERIES
-- =====================================

/*
-- Get AUSTA (Telstra) pricing from all sources:
SELECT * FROM get_pricing_comparison('AUSTA');

-- Get all networks with IMSI fees from Tele2:
SELECT * FROM v_networks_with_imsi_fees 
WHERE source_name = 'Tele2';

-- Compare Australia pricing across sources:
SELECT * FROM v_australia_pricing;

-- Find prohibited networks:
SELECT DISTINCT n.tadig, n.network_name, n.country
FROM networks n
JOIN network_restrictions nr ON n.id = nr.network_id
WHERE nr.restriction_type = 'prohibited'
AND nr.is_active = true;
*/