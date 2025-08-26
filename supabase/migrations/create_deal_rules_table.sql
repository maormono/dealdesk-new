-- Create deal_rules table for storing deal evaluation configuration
CREATE TABLE IF NOT EXISTS deal_rules (
  id INTEGER PRIMARY KEY DEFAULT 1, -- Single row for global rules
  rules JSONB NOT NULL DEFAULT '{
    "minProfitPerActiveSim": 10,
    "minProfitPerMegabyte": 0.01,
    "minDataProfitMargin": 10,
    "packageUnusedAllowance": 30,
    "minDealSize": 100,
    "maxRiskScore": 7
  }'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Ensure only one row exists
  CONSTRAINT deal_rules_single_row CHECK (id = 1)
);

-- Insert default rules if not exists
INSERT INTO deal_rules (id, rules) 
VALUES (1, '{
  "minProfitPerActiveSim": 10,
  "minProfitPerMegabyte": 0.01,
  "minDataProfitMargin": 10,
  "packageUnusedAllowance": 30,
  "minDealSize": 100,
  "maxRiskScore": 7
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies
ALTER TABLE deal_rules ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read rules
CREATE POLICY "deal_rules_read_policy" ON deal_rules
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can update rules
CREATE POLICY "deal_rules_update_policy" ON deal_rules
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Add comment
COMMENT ON TABLE deal_rules IS 'Stores global configuration for deal evaluation rules and profit thresholds';