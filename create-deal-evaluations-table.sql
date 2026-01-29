-- Deal Evaluations Table for Audit System
-- This table stores all deal evaluations with input/output data for persistence and audit

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the deal_evaluations table
CREATE TABLE IF NOT EXISTS deal_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- User association
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email VARCHAR(255) NOT NULL,

  -- Deal metadata
  deal_name VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'evaluated', 'finalized', 'archived')),

  -- Input data (full DealRequest as JSONB)
  deal_request JSONB NOT NULL,

  -- Output data (evaluation results from all services)
  basic_evaluation JSONB,
  enhanced_analysis JSONB,
  comprehensive_analysis JSONB,

  -- Denormalized fields for easy querying/filtering
  sim_quantity INTEGER NOT NULL,
  countries TEXT[] NOT NULL,
  monthly_data_per_sim DECIMAL(10, 4),
  proposed_price_per_sim DECIMAL(10, 4),
  currency VARCHAR(3) DEFAULT 'USD',
  duration_months INTEGER,
  verdict VARCHAR(20),
  profit_margin DECIMAL(5, 4),
  risk_score INTEGER,
  total_contract_value DECIMAL(15, 2),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  evaluated_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deal_evaluations_user ON deal_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_evaluations_status ON deal_evaluations(status);
CREATE INDEX IF NOT EXISTS idx_deal_evaluations_created ON deal_evaluations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_evaluations_verdict ON deal_evaluations(verdict);
CREATE INDEX IF NOT EXISTS idx_deal_evaluations_user_email ON deal_evaluations(user_email);

-- Enable Row Level Security
ALTER TABLE deal_evaluations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own deals
CREATE POLICY "deal_evaluations_user_select" ON deal_evaluations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Users can insert their own deals
CREATE POLICY "deal_evaluations_user_insert" ON deal_evaluations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own deals
CREATE POLICY "deal_evaluations_user_update" ON deal_evaluations
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Admins can read all deals (for audit)
CREATE POLICY "deal_evaluations_admin_select" ON deal_evaluations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_deal_evaluations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_deal_evaluations_updated_at ON deal_evaluations;
CREATE TRIGGER trigger_deal_evaluations_updated_at
  BEFORE UPDATE ON deal_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_evaluations_updated_at();

-- Add table comment
COMMENT ON TABLE deal_evaluations IS 'Stores deal evaluations with input/output data for persistence and audit tracking';

-- Grant permissions
GRANT ALL ON deal_evaluations TO authenticated;
GRANT ALL ON deal_evaluations TO service_role;
