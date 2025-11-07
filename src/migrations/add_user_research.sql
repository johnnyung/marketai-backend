-- User Research Table
-- Stores user's manually added research, articles, and insights

CREATE TABLE IF NOT EXISTS user_research (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'article', 'note', 'link', 'insight'
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  url TEXT,
  ticker VARCHAR(10), -- Related stock ticker
  tags TEXT[], -- Array of tags
  importance VARCHAR(10) DEFAULT 'medium', -- 'high', 'medium', 'low'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_research_user_id ON user_research(user_id);
CREATE INDEX IF NOT EXISTS idx_user_research_created_at ON user_research(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_research_ticker ON user_research(ticker);
CREATE INDEX IF NOT EXISTS idx_user_research_importance ON user_research(importance);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_user_research_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_research_updated_at
  BEFORE UPDATE ON user_research
  FOR EACH ROW
  EXECUTE FUNCTION update_user_research_timestamp();
