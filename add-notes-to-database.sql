-- Add notes columns to network_pricing table
ALTER TABLE network_pricing 
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS note_category VARCHAR(50);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_network_pricing_notes ON network_pricing(note_category);

-- Note categories:
-- 'no-permanent-roaming': No permanent roaming allowed
-- 'access-fee': Has access/IMSI fee
-- 'data-unavailable': Data service not launched/available
-- 'prohibited': Prohibited or blocked network
-- 'no-resale': No resale on domestic market
-- 'service-limited': Services not available or limited
-- 'direct-roaming': Direct roaming arrangement
-- 'other': Other restrictions