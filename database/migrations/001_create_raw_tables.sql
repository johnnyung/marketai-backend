-- MarketAI v2.0 - Raw Data Tables

-- Raw Reddit Posts
CREATE TABLE raw_reddit_posts (
  id SERIAL PRIMARY KEY,
  post_id VARCHAR(50) UNIQUE NOT NULL,
  subreddit VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  selftext TEXT,
  author VARCHAR(50),
  score INTEGER DEFAULT 0,
  num_comments INTEGER DEFAULT 0,
  upvote_ratio DECIMAL(3,2),
  permalink TEXT,
  url TEXT,
  created_utc TIMESTAMP NOT NULL,
  collected_at TIMESTAMP DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP,
  raw_json JSONB NOT NULL
);

CREATE INDEX idx_raw_reddit_processed ON raw_reddit_posts(processed);
CREATE INDEX idx_raw_reddit_subreddit ON raw_reddit_posts(subreddit);
CREATE INDEX idx_raw_reddit_created ON raw_reddit_posts(created_utc DESC);

-- Raw News Articles
CREATE TABLE raw_news_articles (
  id SERIAL PRIMARY KEY,
  article_url TEXT UNIQUE NOT NULL,
  source VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  author VARCHAR(100),
  url TEXT NOT NULL,
  image_url TEXT,
  published_at TIMESTAMP NOT NULL,
  collected_at TIMESTAMP DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP,
  raw_json JSONB NOT NULL
);

CREATE INDEX idx_raw_news_processed ON raw_news_articles(processed);
CREATE INDEX idx_raw_news_published ON raw_news_articles(published_at DESC);

-- Data Collection Status
CREATE TABLE data_collection_status (
  id SERIAL PRIMARY KEY,
  source_type VARCHAR(50) NOT NULL,
  items_collected INTEGER DEFAULT 0,
  items_stored INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  duration_seconds INTEGER,
  status VARCHAR(20) DEFAULT 'running',
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_collection_source ON data_collection_status(source_type);
CREATE INDEX idx_collection_started ON data_collection_status(started_at DESC);

-- AI Processing Status
CREATE TABLE ai_processing_status (
  id SERIAL PRIMARY KEY,
  source_type VARCHAR(50) NOT NULL,
  items_processed INTEGER DEFAULT 0,
  tickers_extracted INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  duration_seconds INTEGER,
  ai_tokens_used INTEGER DEFAULT 0,
  estimated_cost_usd DECIMAL(10,4) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'running',
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_processing_source ON ai_processing_status(source_type);
CREATE INDEX idx_processing_started ON ai_processing_status(started_at DESC);

-- Digest Entries (recreate for v2.0)
CREATE TABLE digest_entries (
  id SERIAL PRIMARY KEY,
  source_type VARCHAR(50) NOT NULL,
  source_name VARCHAR(100),
  raw_data JSONB,
  raw_url TEXT,
  ai_summary TEXT,
  ai_relevance_score INTEGER,
  ai_sentiment VARCHAR(20),
  ai_importance VARCHAR(20),
  tickers TEXT[],
  tags TEXT[],
  event_date TIMESTAMP,
  content_url TEXT,
  expires_at TIMESTAMP,
  content_hash VARCHAR(64) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_digest_tickers ON digest_entries USING GIN(tickers);
CREATE INDEX idx_digest_created ON digest_entries(created_at DESC);
CREATE INDEX idx_digest_importance ON digest_entries(ai_importance);
