-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/uddmjjgnexdazfedrytt/sql

-- Drop old network_pricing table and recreate with new structure
DROP TABLE IF EXISTS network_pricing CASCADE;

-- Table to store network pricing data
CREATE TABLE network_pricing (
  id SERIAL PRIMARY KEY,
  country TEXT NOT NULL,
  network_name TEXT NOT NULL,
  tadig TEXT NOT NULL,
  identity TEXT NOT NULL,
  data_per_mb DECIMAL(10,6) DEFAULT 0,
  sms_cost DECIMAL(10,4) DEFAULT 0,
  imsi_cost DECIMAL(10,4) DEFAULT 0,
  gsm BOOLEAN DEFAULT FALSE,
  gprs_2g BOOLEAN DEFAULT FALSE,
  umts_3g BOOLEAN DEFAULT FALSE,
  lte_4g BOOLEAN DEFAULT FALSE,
  lte_5g BOOLEAN DEFAULT FALSE,
  lte_m BOOLEAN DEFAULT FALSE,
  lte_m_double BOOLEAN DEFAULT FALSE,
  nb_iot BOOLEAN DEFAULT FALSE,
  nb_iot_double BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track uploaded files
CREATE TABLE IF NOT EXISTS data_uploads (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  record_count INTEGER NOT NULL,
  uploaded_by TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE network_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_uploads ENABLE ROW LEVEL SECURITY;

-- Allow read for all authenticated users
CREATE POLICY "Allow read network_pricing" ON network_pricing FOR SELECT USING (true);
CREATE POLICY "Allow insert network_pricing" ON network_pricing FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow delete network_pricing" ON network_pricing FOR DELETE USING (true);

CREATE POLICY "Allow read data_uploads" ON data_uploads FOR SELECT USING (true);
CREATE POLICY "Allow insert data_uploads" ON data_uploads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow delete data_uploads" ON data_uploads FOR DELETE USING (true);

-- Index for faster queries
CREATE INDEX idx_network_pricing_country ON network_pricing(country);
CREATE INDEX idx_network_pricing_tadig ON network_pricing(tadig);
