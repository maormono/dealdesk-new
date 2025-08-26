-- Add restrictions column to network_pricing table
-- This allows us to store notes/restrictions directly in the database

ALTER TABLE network_pricing 
ADD COLUMN IF NOT EXISTS restrictions TEXT;

-- Create an index for faster queries on restrictions
CREATE INDEX IF NOT EXISTS idx_network_pricing_restrictions 
ON network_pricing(network_id, source_id) 
WHERE restrictions IS NOT NULL;

-- View to see networks with restrictions
CREATE OR REPLACE VIEW network_restrictions AS
SELECT 
    n.tadig,
    n.network_name,
    n.country,
    ps.source_name,
    np.restrictions,
    np.updated_at
FROM network_pricing np
JOIN networks n ON np.network_id = n.id
JOIN pricing_sources ps ON np.source_id = ps.id
WHERE np.restrictions IS NOT NULL
ORDER BY n.country, n.network_name, ps.source_name;