-- MARKETAI DIGEST DATABASE
-- Phase 1: Data Collection & AI Analysis ONLY

-- Drop existing tables if rebuilding
DROP TABLE IF EXISTS digest_entries CASCADE;
DROP TABLE IF EXISTS digest_sources CASCADE;
DROP TABLE IF EXISTS digest_stats CASCADE;

-- Main digest table
CREATE TABLE digest_entries (
  id SERIAL PRIMARY KEY,
  
  source_type VARCHAR(50) NOT NULL,
  source_name VARCHAR(100) NOT NULL,
  raw_data JSONB NOT NULL,
  raw_url TEXT,
  
  ai_summary TEXT NOT NULL,
  ai_relevance_score INTEGER NOT NULL CHECK (ai_relevance_score BETWEEN 0 AND 100),
  ai_sentiment VARCHAR(20) NOT NULL CHECK (ai_sentiment IN ('bullish', 'bearish', 'neutral', 'mixed')),
  ai_importance VARCHAR(20) NOT NULL CHECK (ai_importance IN ('critical', 'high', 'medium', 'low')),
  ai_category TEXT[],
  
  tickers TEXT[],
  companies TEXT[],
  people TEXT[],
  topics TEXT[],
  
  event_date TIMESTAMP NOT NULL,
  ingested_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  
  content_hash VARCHAR(64) UNIQUE NOT NULL,
  
  is_processed BOOLEAN DEFAULT TRUE,
  is_archived BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_source_type ON digest_entries(source_type);
CREATE INDEX idx_relevance ON digest_entries(ai_relevance_score DESC);
CREATE INDEX idx_event_date ON digest_entries(event_date DESC);
CREATE INDEX idx_expires_at ON digest_entries(expires_at);
CREATE INDEX idx_tickers ON digest_entries USING GIN(tickers);
CREATE INDEX idx_sentiment ON digest_entries(ai_sentiment);

-- Source tracking
CREATE TABLE digest_sources (
  id SERIAL PRIMARY KEY,
  source_name VARCHAR(100) UNIQUE NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_fetch_at TIMESTAMP,
  last_success_at TIMESTAMP,
  last_error TEXT,
  total_entries_collected INTEGER DEFAULT 0,
  total_entries_stored INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 100.00,
  fetch_interval_minutes INTEGER DEFAULT 60,
  retention_days INTEGER DEFAULT 30,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO digest_sources (source_name, source_type, retention_days) VALUES
  ('SEC EDGAR', 'insider_trade', 90),
  ('Reddit WSB', 'social_reddit', 7),
  ('Twitter/X', 'social_twitter', 7),
  ('Congressional Trading', 'political_trade', 180),
  ('News APIs', 'news', 30),
  ('Alpha Vantage', 'technical_signal', 14),
  ('Economic Calendar', 'economic_data', 90);

-- Daily stats
CREATE TABLE digest_stats (
  id SERIAL PRIMARY KEY,
  date DATE DEFAULT CURRENT_DATE UNIQUE,
  total_collected INTEGER DEFAULT 0,
  total_stored INTEGER DEFAULT 0,
  duplicates_filtered INTEGER DEFAULT 0,
  avg_relevance_score DECIMAL(5,2),
  critical_entries INTEGER DEFAULT 0,
  high_entries INTEGER DEFAULT 0,
  ingestion_time_seconds INTEGER,
  api_calls_made INTEGER,
  total_entries_in_db INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER digest_entries_timestamp 
  BEFORE UPDATE ON digest_entries
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER digest_sources_timestamp 
  BEFORE UPDATE ON digest_sources
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM digest_entries 
    WHERE expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Views
CREATE VIEW todays_insights AS
SELECT 
  id, source_type, source_name, ai_summary,
  ai_relevance_score, ai_sentiment, tickers, event_date
FROM digest_entries
WHERE event_date >= CURRENT_DATE
  AND ai_relevance_score >= 70
ORDER BY ai_relevance_score DESC, event_date DESC;

CREATE VIEW trending_tickers AS
SELECT 
  ticker,
  COUNT(*) as mention_count,
  AVG(ai_relevance_score) as avg_score,
  MAX(event_date) as last_seen,
  STRING_AGG(DISTINCT ai_sentiment, ', ') as sentiments
FROM digest_entries, UNNEST(tickers) ticker
WHERE event_date > NOW() - INTERVAL '7 days'
GROUP BY ticker
HAVING COUNT(*) >= 2
ORDER BY mention_count DESC, avg_score DESC;

CREATE VIEW source_health AS
SELECT 
  source_name, source_type, is_active,
  last_success_at, total_entries_collected, success_rate,
  CASE 
    WHEN last_success_at > NOW() - INTERVAL '2 hours' THEN 'healthy'
    WHEN last_success_at > NOW() - INTERVAL '24 hours' THEN 'warning'
    ELSE 'error'
  END as status
FROM digest_sources
ORDER BY is_active DESC, last_success_at DESC;
