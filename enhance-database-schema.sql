-- Comprehensive database enhancement for network_pricing table
-- Adding all fields from operator Excel files

-- Add SMS pricing columns (if not exist)
ALTER TABLE network_pricing 
ADD COLUMN IF NOT EXISTS sms_mo DECIMAL(10, 6),  -- SMS Mobile Originated
ADD COLUMN IF NOT EXISTS sms_mt DECIMAL(10, 6);  -- SMS Mobile Terminated

-- Add Voice pricing columns (if not exist)
ALTER TABLE network_pricing 
ADD COLUMN IF NOT EXISTS voice_moc DECIMAL(10, 6),  -- Voice Mobile Originated Call
ADD COLUMN IF NOT EXISTS voice_mtc DECIMAL(10, 6);  -- Voice Mobile Terminated Call

-- Add technology support columns (boolean flags)
ALTER TABLE network_pricing 
ADD COLUMN IF NOT EXISTS gsm_2g BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS umts_3g BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lte_4g BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS nr_5g BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lte_m BOOLEAN DEFAULT false,    -- CAT-M1
ADD COLUMN IF NOT EXISTS nb_iot BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS volte BOOLEAN DEFAULT false;

-- Add additional service columns
ALTER TABLE network_pricing 
ADD COLUMN IF NOT EXISTS restrictions TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS minimum_commitment DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS volume_discount_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_updated DATE,
ADD COLUMN IF NOT EXISTS is_promotional BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS promotional_end_date DATE;

-- Add columns for Telefonica-specific data
ALTER TABLE network_pricing 
ADD COLUMN IF NOT EXISTS steering_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS imsi_change_allowed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS multi_imsi_supported BOOLEAN DEFAULT false;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_network_pricing_technologies 
ON network_pricing(network_id, source_id) 
WHERE lte_4g = true OR nr_5g = true OR lte_m = true OR nb_iot = true;

CREATE INDEX IF NOT EXISTS idx_network_pricing_sms 
ON network_pricing(network_id, source_id) 
WHERE sms_mo IS NOT NULL OR sms_mt IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_network_pricing_voice 
ON network_pricing(network_id, source_id) 
WHERE voice_moc IS NOT NULL OR voice_mtc IS NOT NULL;

-- Create a comprehensive view for network capabilities
CREATE OR REPLACE VIEW network_capabilities AS
SELECT 
    n.tadig,
    n.network_name,
    n.country,
    ps.source_name,
    np.data_per_mb,
    np.sms_mo,
    np.sms_mt,
    np.voice_moc,
    np.voice_mtc,
    np.imsi_access_fee,
    -- Technology support
    CASE 
        WHEN np.gsm_2g THEN '2G' 
        ELSE '-' 
    END as "2G",
    CASE 
        WHEN np.umts_3g THEN '3G' 
        ELSE '-' 
    END as "3G",
    CASE 
        WHEN np.lte_4g THEN '4G' 
        ELSE '-' 
    END as "4G",
    CASE 
        WHEN np.nr_5g THEN '5G' 
        ELSE '-' 
    END as "5G",
    CASE 
        WHEN np.lte_m THEN 'CAT-M' 
        ELSE '-' 
    END as "CAT-M",
    CASE 
        WHEN np.nb_iot THEN 'NB-IoT' 
        ELSE '-' 
    END as "NB-IoT",
    CASE 
        WHEN np.volte THEN 'VoLTE' 
        ELSE '-' 
    END as "VoLTE",
    np.restrictions,
    np.notes,
    np.last_updated
FROM network_pricing np
JOIN networks n ON np.network_id = n.id
JOIN pricing_sources ps ON np.source_id = ps.id
ORDER BY n.country, n.network_name, ps.source_name;

-- Create a view for comparing prices across sources
CREATE OR REPLACE VIEW price_comparison AS
SELECT 
    n.tadig,
    n.network_name,
    n.country,
    MAX(CASE WHEN ps.source_name = 'A1' THEN np.data_per_mb END) as a1_data,
    MAX(CASE WHEN ps.source_name = 'Telefonica' THEN np.data_per_mb END) as telefonica_data,
    MAX(CASE WHEN ps.source_name = 'Tele2' THEN np.data_per_mb END) as tele2_data,
    MAX(CASE WHEN ps.source_name = 'A1' THEN np.imsi_access_fee END) as a1_imsi,
    MAX(CASE WHEN ps.source_name = 'Telefonica' THEN np.imsi_access_fee END) as telefonica_imsi,
    MAX(CASE WHEN ps.source_name = 'Tele2' THEN np.imsi_access_fee END) as tele2_imsi,
    -- Best prices
    LEAST(
        MAX(CASE WHEN ps.source_name = 'A1' THEN np.data_per_mb END),
        MAX(CASE WHEN ps.source_name = 'Telefonica' THEN np.data_per_mb END),
        MAX(CASE WHEN ps.source_name = 'Tele2' THEN np.data_per_mb END)
    ) as best_data_price,
    CASE 
        WHEN LEAST(
            MAX(CASE WHEN ps.source_name = 'A1' THEN np.data_per_mb END),
            MAX(CASE WHEN ps.source_name = 'Telefonica' THEN np.data_per_mb END),
            MAX(CASE WHEN ps.source_name = 'Tele2' THEN np.data_per_mb END)
        ) = MAX(CASE WHEN ps.source_name = 'A1' THEN np.data_per_mb END) THEN 'A1'
        WHEN LEAST(
            MAX(CASE WHEN ps.source_name = 'A1' THEN np.data_per_mb END),
            MAX(CASE WHEN ps.source_name = 'Telefonica' THEN np.data_per_mb END),
            MAX(CASE WHEN ps.source_name = 'Tele2' THEN np.data_per_mb END)
        ) = MAX(CASE WHEN ps.source_name = 'Telefonica' THEN np.data_per_mb END) THEN 'Telefonica'
        WHEN LEAST(
            MAX(CASE WHEN ps.source_name = 'A1' THEN np.data_per_mb END),
            MAX(CASE WHEN ps.source_name = 'Telefonica' THEN np.data_per_mb END),
            MAX(CASE WHEN ps.source_name = 'Tele2' THEN np.data_per_mb END)
        ) = MAX(CASE WHEN ps.source_name = 'Tele2' THEN np.data_per_mb END) THEN 'Tele2'
    END as best_source
FROM networks n
LEFT JOIN network_pricing np ON n.id = np.network_id
LEFT JOIN pricing_sources ps ON np.source_id = ps.id
GROUP BY n.tadig, n.network_name, n.country;

-- Add comments to document the columns
COMMENT ON COLUMN network_pricing.sms_mo IS 'SMS Mobile Originated price per message';
COMMENT ON COLUMN network_pricing.sms_mt IS 'SMS Mobile Terminated price per message';
COMMENT ON COLUMN network_pricing.voice_moc IS 'Voice Mobile Originated Call price per minute';
COMMENT ON COLUMN network_pricing.voice_mtc IS 'Voice Mobile Terminated Call price per minute';
COMMENT ON COLUMN network_pricing.gsm_2g IS '2G GSM/GPRS/EDGE support';
COMMENT ON COLUMN network_pricing.umts_3g IS '3G UMTS/HSPA support';
COMMENT ON COLUMN network_pricing.lte_4g IS '4G LTE support';
COMMENT ON COLUMN network_pricing.nr_5g IS '5G NR support';
COMMENT ON COLUMN network_pricing.lte_m IS 'LTE-M (CAT-M1) IoT support';
COMMENT ON COLUMN network_pricing.nb_iot IS 'NB-IoT support';
COMMENT ON COLUMN network_pricing.volte IS 'Voice over LTE support';
COMMENT ON COLUMN network_pricing.restrictions IS 'Network restrictions and limitations';
COMMENT ON COLUMN network_pricing.notes IS 'Additional notes and comments';