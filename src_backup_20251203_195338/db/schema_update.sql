-- Run this in Railway Connect if tables don't exist
CREATE TABLE IF NOT EXISTS raw_intelligence (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL, -- 'insider', 'political', 'news', 'crypto', 'macro'
    source VARCHAR(100) NOT NULL,
    external_id VARCHAR(255) UNIQUE, -- Content Hash for deduplication
    title TEXT,
    content TEXT,
    url TEXT,
    published_at TIMESTAMP,
    tickers TEXT[], -- Array of related tickers
    sentiment_score DECIMAL,
    raw_metadata JSONB, -- Store the full original object here
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP -- When this data becomes irrelevant
);

CREATE INDEX IF NOT EXISTS idx_intelligence_category ON raw_intelligence(category);
CREATE INDEX IF NOT EXISTS idx_intelligence_published ON raw_intelligence(published_at);
