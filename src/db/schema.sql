-- MarketAI Database Schema
-- PostgreSQL

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_verified BOOLEAN DEFAULT FALSE,
  settings JSONB DEFAULT '{}'::jsonb
);

-- User profiles
CREATE TABLE user_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  experience_level VARCHAR(20) DEFAULT 'beginner', -- beginner, intermediate, advanced
  investment_goals TEXT[],
  risk_tolerance VARCHAR(20) DEFAULT 'moderate', -- conservative, moderate, aggressive
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolios (users can have multiple portfolios)
CREATE TABLE portfolios (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'stocks', 'futures', 'options', 'paper'
  starting_cash DECIMAL(15,2) NOT NULL DEFAULT 100000.00,
  current_cash DECIMAL(15,2) NOT NULL DEFAULT 100000.00,
  total_value DECIMAL(15,2) NOT NULL DEFAULT 100000.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock positions
CREATE TABLE stock_positions (
  id SERIAL PRIMARY KEY,
  portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  ticker VARCHAR(10) NOT NULL,
  company_name VARCHAR(255),
  shares INTEGER NOT NULL,
  avg_buy_price DECIMAL(10,4) NOT NULL,
  current_price DECIMAL(10,4),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(portfolio_id, ticker)
);

-- Futures positions
CREATE TABLE futures_positions (
  id SERIAL PRIMARY KEY,
  portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  symbol VARCHAR(10) NOT NULL, -- ES, NQ, CL, GC, etc.
  contract_month VARCHAR(10) NOT NULL, -- 'Dec2024', 'Mar2025'
  contracts INTEGER NOT NULL, -- number of contracts (can be negative for shorts)
  entry_price DECIMAL(10,4) NOT NULL,
  current_price DECIMAL(10,4),
  multiplier DECIMAL(10,2) NOT NULL, -- $50 for ES, $20 for NQ, etc.
  margin_per_contract DECIMAL(10,2) NOT NULL,
  expiration_date DATE NOT NULL,
  unrealized_pnl DECIMAL(15,2) DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trade history
CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  asset_type VARCHAR(20) NOT NULL, -- 'stock', 'futures', 'option'
  symbol VARCHAR(10) NOT NULL,
  action VARCHAR(10) NOT NULL, -- 'buy', 'sell', 'short', 'cover'
  quantity INTEGER NOT NULL,
  price DECIMAL(10,4) NOT NULL,
  commission DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(15,2) NOT NULL,
  notes TEXT,
  reasoning TEXT, -- user's trade reasoning
  ai_review TEXT, -- AI analysis of the trade
  ai_score INTEGER, -- 1-10 rating from AI
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Futures-specific trade details
CREATE TABLE futures_trades (
  id SERIAL PRIMARY KEY,
  trade_id INTEGER REFERENCES trades(id) ON DELETE CASCADE,
  contract_month VARCHAR(10) NOT NULL,
  multiplier DECIMAL(10,2) NOT NULL,
  margin_used DECIMAL(15,2) NOT NULL,
  expiration_date DATE NOT NULL,
  is_day_trade BOOLEAN DEFAULT FALSE,
  overnight_margin DECIMAL(15,2)
);

-- Watchlist
CREATE TABLE watchlist (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  symbol VARCHAR(10) NOT NULL,
  asset_type VARCHAR(20) NOT NULL, -- 'stock', 'futures', 'crypto'
  notes TEXT,
  focus_areas TEXT[],
  price_alert_high DECIMAL(10,4),
  price_alert_low DECIMAL(10,4),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, symbol)
);

-- Alerts
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL, -- 'price', 'news', 'earnings', 'economic_data'
  symbol VARCHAR(10),
  condition JSONB NOT NULL, -- {type: 'price_above', value: 100}
  message TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Economic calendar events
CREATE TABLE economic_events (
  id SERIAL PRIMARY KEY,
  event_name VARCHAR(255) NOT NULL,
  country VARCHAR(50),
  category VARCHAR(50), -- 'inflation', 'employment', 'gdp', etc.
  importance VARCHAR(20), -- 'low', 'medium', 'high'
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  actual_value VARCHAR(50),
  forecast_value VARCHAR(50),
  previous_value VARCHAR(50),
  currency VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- News articles (cached)
CREATE TABLE news_articles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT UNIQUE NOT NULL,
  source VARCHAR(100),
  published_at TIMESTAMP NOT NULL,
  symbols TEXT[], -- related stock symbols
  sentiment VARCHAR(20), -- 'positive', 'negative', 'neutral'
  ai_summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI chat history
CREATE TABLE chat_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  context JSONB, -- related portfolio, positions, etc.
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance metrics (daily snapshots)
CREATE TABLE portfolio_snapshots (
  id SERIAL PRIMARY KEY,
  portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  total_value DECIMAL(15,2) NOT NULL,
  cash DECIMAL(15,2) NOT NULL,
  positions_value DECIMAL(15,2) NOT NULL,
  daily_pnl DECIMAL(15,2),
  total_return_pct DECIMAL(10,4),

-- Trade Journal
CREATE TABLE trade_journal (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  trade_id INTEGER, -- optional reference to actual trade
  ticker VARCHAR(10) NOT NULL,
  entry_date DATE NOT NULL,
  exit_date DATE,
  strategy VARCHAR(100),
  setup_notes TEXT,
  execution_notes TEXT,
  outcome_notes TEXT,
  emotional_state VARCHAR(50),
  lessons_learned TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  tags TEXT[],
  attachments JSONB, -- screenshots, charts, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Learning Progress
CREATE TABLE learning_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  module_id VARCHAR(50) NOT NULL,
  module_title VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'not_started', -- not_started, in_progress, completed
  progress_pct INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  quiz_score INTEGER,
  notes TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, module_id)
);

-- Learning Modules (content)
CREATE TABLE learning_modules (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'basics', 'technical_analysis', 'fundamental_analysis', etc.
  difficulty VARCHAR(20) NOT NULL, -- 'beginner', 'intermediate', 'advanced'
  description TEXT,
  content TEXT, -- markdown content
  duration_minutes INTEGER,
  order_index INTEGER DEFAULT 0,
  prerequisites TEXT[], -- module IDs
  tags TEXT[],
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance metrics (daily snapshots continued)
CREATE TABLE portfolio_snapshots (
  id SERIAL PRIMARY KEY,
  portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  total_value DECIMAL(15,2) NOT NULL,
  cash DECIMAL(15,2) NOT NULL,
  positions_value DECIMAL(15,2) NOT NULL,
  daily_pnl DECIMAL(15,2),
  total_return_pct DECIMAL(10,4),
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(portfolio_id, snapshot_date)
);

-- Futures contract specifications (reference data)
CREATE TABLE futures_contracts (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  exchange VARCHAR(50),
  multiplier DECIMAL(10,2) NOT NULL,
  tick_size DECIMAL(10,4) NOT NULL,
  tick_value DECIMAL(10,2) NOT NULL,
  initial_margin DECIMAL(10,2) NOT NULL,
  maintenance_margin DECIMAL(10,2) NOT NULL,
  day_trade_margin DECIMAL(10,2),
  trading_hours TEXT,
  contract_months TEXT[], -- ['Mar', 'Jun', 'Sep', 'Dec']
  description TEXT
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_stock_positions_portfolio ON stock_positions(portfolio_id);
CREATE INDEX idx_futures_positions_portfolio ON futures_positions(portfolio_id);
CREATE INDEX idx_trades_portfolio ON trades(portfolio_id);
CREATE INDEX idx_trades_executed_at ON trades(executed_at);
CREATE INDEX idx_watchlist_user ON watchlist(user_id);
CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_chat_history_user ON chat_history(user_id);
CREATE INDEX idx_news_published ON news_articles(published_at DESC);
CREATE INDEX idx_economic_events_date ON economic_events(scheduled_date);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed futures contract data
INSERT INTO futures_contracts (symbol, name, exchange, multiplier, tick_size, tick_value, initial_margin, maintenance_margin, day_trade_margin, contract_months, description) VALUES
('ES', 'E-mini S&P 500', 'CME', 50.00, 0.25, 12.50, 13200.00, 12000.00, 6600.00, ARRAY['Mar', 'Jun', 'Sep', 'Dec'], 'Most liquid equity index futures contract'),
('NQ', 'E-mini NASDAQ 100', 'CME', 20.00, 0.25, 5.00, 19800.00, 18000.00, 9900.00, ARRAY['Mar', 'Jun', 'Sep', 'Dec'], 'Tech-heavy index futures'),
('RTY', 'E-mini Russell 2000', 'CME', 50.00, 0.10, 5.00, 6600.00, 6000.00, 3300.00, ARRAY['Mar', 'Jun', 'Sep', 'Dec'], 'Small-cap index futures'),
('YM', 'E-mini Dow', 'CBOT', 5.00, 1.00, 5.00, 11550.00, 10500.00, 5775.00, ARRAY['Mar', 'Jun', 'Sep', 'Dec'], 'Dow Jones Industrial Average futures'),
('CL', 'Crude Oil', 'NYMEX', 1000.00, 0.01, 10.00, 8250.00, 7500.00, 4125.00, ARRAY['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], 'WTI Crude Oil futures'),
('GC', 'Gold', 'COMEX', 100.00, 0.10, 10.00, 11000.00, 10000.00, 5500.00, ARRAY['Feb', 'Apr', 'Jun', 'Aug', 'Dec'], 'Gold futures'),
('SI', 'Silver', 'COMEX', 5000.00, 0.005, 25.00, 19250.00, 17500.00, 9625.00, ARRAY['Mar', 'May', 'Jul', 'Sep', 'Dec'], 'Silver futures'),
('6E', 'Euro FX', 'CME', 125000.00, 0.00005, 6.25, 2970.00, 2700.00, 1485.00, ARRAY['Mar', 'Jun', 'Sep', 'Dec'], 'Euro currency futures');
