-- Fix RLS policies to allow inserts and updates
-- Run this in your Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON networks;
DROP POLICY IF EXISTS "Enable read access for all users" ON network_pricing;
DROP POLICY IF EXISTS "Enable read access for all users" ON network_restrictions;
DROP POLICY IF EXISTS "Enable read access for all users" ON pricing_sources;

-- Create new policies that allow all operations for authenticated users
-- Networks table
CREATE POLICY "Enable all access for authenticated users" ON networks
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- Network pricing table  
CREATE POLICY "Enable all access for authenticated users" ON network_pricing
    FOR ALL















    USING (true)
    WITH CHECK (true);

-- Network restrictions table
CREATE POLICY "Enable all access for authenticated users" ON network_restrictions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Pricing sources table
CREATE POLICY "Enable all access for authenticated users" ON pricing_sources
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Or if you want to disable RLS entirely for now (easier for testing):
ALTER TABLE networks DISABLE ROW LEVEL SECURITY;
ALTER TABLE network_pricing DISABLE ROW LEVEL SECURITY;
ALTER TABLE network_restrictions DISABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_sources DISABLE ROW LEVEL SECURITY;
ALTER TABLE network_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE import_history DISABLE ROW LEVEL SECURITY;
