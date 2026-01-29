-- Upcoming Features Table for Admin Feature Roadmap
-- This table stores upcoming features that admins can view and prioritize

CREATE TABLE IF NOT EXISTS upcoming_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Feature details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 0, -- Lower number = higher priority
  status VARCHAR(20) NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),

  -- Metadata
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for ordering by priority
CREATE INDEX IF NOT EXISTS idx_upcoming_features_priority ON upcoming_features(priority ASC);

-- Enable RLS
ALTER TABLE upcoming_features ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view features
CREATE POLICY "upcoming_features_admin_select" ON upcoming_features
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Policy: Only admins can insert features
CREATE POLICY "upcoming_features_admin_insert" ON upcoming_features
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Policy: Only admins can update features (for reordering)
CREATE POLICY "upcoming_features_admin_update" ON upcoming_features
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Policy: Only specific users can delete (asaf@monogoto.io, maor@monogoto.io)
CREATE POLICY "upcoming_features_superadmin_delete" ON upcoming_features
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('asaf@monogoto.io', 'maor@monogoto.io')
    )
  );

-- Create trigger for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_upcoming_features_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_upcoming_features_updated_at ON upcoming_features;
CREATE TRIGGER trigger_upcoming_features_updated_at
  BEFORE UPDATE ON upcoming_features
  FOR EACH ROW
  EXECUTE FUNCTION update_upcoming_features_updated_at();

-- Grant permissions
GRANT ALL ON upcoming_features TO authenticated;
GRANT ALL ON upcoming_features TO service_role;

-- Add some initial features as examples (optional - remove if not needed)
INSERT INTO upcoming_features (title, description, priority, status, created_by) VALUES
  ('Real-time Collaboration', 'Allow multiple users to work on the same deal simultaneously', 1, 'planned', 'system'),
  ('Advanced Analytics Dashboard', 'Comprehensive analytics with charts and trends', 2, 'planned', 'system'),
  ('Bulk Deal Import', 'Import multiple deals from Excel/CSV files', 3, 'planned', 'system'),
  ('Email Notifications', 'Automated email alerts for deal status changes', 4, 'planned', 'system'),
  ('Custom Deal Templates', 'Save and reuse deal configurations as templates', 5, 'planned', 'system');
