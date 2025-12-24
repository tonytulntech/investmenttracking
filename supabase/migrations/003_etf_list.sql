-- ETF List table for local autocomplete (zero API calls)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS etf_list (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL,           -- Full ticker with exchange (e.g., VWCE.XETRA)
  code TEXT NOT NULL,             -- Ticker code only (e.g., VWCE)
  exchange TEXT NOT NULL,         -- Exchange code (e.g., XETRA, MI, LSE)
  name TEXT NOT NULL,             -- Full name
  isin TEXT,                      -- ISIN for matching across exchanges
  type TEXT DEFAULT 'ETF',        -- ETF, Stock, etc.
  currency TEXT DEFAULT 'EUR',    -- Trading currency
  asset_class TEXT DEFAULT 'equity', -- equity, bond, commodity, mixed
  region TEXT DEFAULT 'Global',   -- Global, USA, Europe, Emerging, etc.
  provider TEXT,                  -- iShares, Vanguard, Amundi, Xtrackers, etc.
  ter DECIMAL(5,4),               -- Total Expense Ratio (e.g., 0.0022 = 0.22%)
  distribution TEXT,              -- ACC (accumulating) or DIST (distributing)
  replication TEXT,               -- Physical or Synthetic
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: same code can exist on multiple exchanges
  UNIQUE(code, exchange)
);

-- Index for fast search
CREATE INDEX IF NOT EXISTS idx_etf_list_code ON etf_list(code);
CREATE INDEX IF NOT EXISTS idx_etf_list_isin ON etf_list(isin);
CREATE INDEX IF NOT EXISTS idx_etf_list_name ON etf_list USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_etf_list_search ON etf_list(code, name, isin);

-- Disable RLS for now (enable when auth is added)
ALTER TABLE etf_list DISABLE ROW LEVEL SECURITY;

-- Grant access
GRANT ALL ON etf_list TO anon, authenticated;
