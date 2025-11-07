-- Migration: Add watchlist, journal, and learning features
-- Run this after the main schema.sql

-- Trade Journal table
CREATE TABLE IF NOT EXISTS trade_journal (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  trade_id INTEGER,
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
  attachments JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Learning Progress table
CREATE TABLE IF NOT EXISTS learning_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  module_id VARCHAR(50) NOT NULL,
  module_title VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'not_started',
  progress_pct INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  quiz_score INTEGER,
  notes TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, module_id)
);

-- Learning Modules table
CREATE TABLE IF NOT EXISTS learning_modules (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  difficulty VARCHAR(20) NOT NULL,
  description TEXT,
  content TEXT,
  duration_minutes INTEGER,
  order_index INTEGER DEFAULT 0,
  prerequisites TEXT[],
  tags TEXT[],
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Learning Modules
INSERT INTO learning_modules (id, title, category, difficulty, description, content, duration_minutes, order_index, tags) VALUES
('basics-001', 'Introduction to Trading', 'basics', 'beginner', 'Learn the fundamentals of stock and futures trading', '# Introduction to Trading

## What is Trading?

Trading involves buying and selling financial instruments with the goal of generating profits. This can include stocks, futures contracts, options, and other securities.

## Key Concepts

### 1. Markets
- Stock Market
- Futures Market  
- Options Market
- Forex Market

### 2. Basic Terminology
- **Bid**: The price buyers are willing to pay
- **Ask**: The price sellers are asking
- **Spread**: The difference between bid and ask
- **Volume**: Number of shares/contracts traded

### 3. Order Types
- Market Order: Execute immediately at current price
- Limit Order: Execute only at specified price or better
- Stop Order: Triggers when price reaches specified level

## Getting Started

1. Open a brokerage account
2. Fund your account
3. Research potential trades
4. Start with paper trading
5. Gradually move to real money with small positions

## Risk Management

Always use stop losses and never risk more than 1-2% of your account on a single trade.', 30, 1, ARRAY['basics', 'introduction', 'getting-started']),

('basics-002', 'Understanding Risk Management', 'basics', 'beginner', 'Essential risk management principles every trader needs', '# Risk Management

## Why Risk Management Matters

95% of traders fail due to poor risk management. This module teaches you how to protect your capital.

## Position Sizing

Never risk more than 1-2% of your account on any single trade.

**Example:**
- Account Size: $10,000
- Risk per trade: 1% = $100
- Stop loss: $2 per share
- Position size: $100 / $2 = 50 shares

## Stop Losses

Always set stop losses BEFORE entering a trade. Common types:
- Fixed dollar amount
- Percentage-based
- Technical level-based (support/resistance)

## Diversification

Don''t put all eggs in one basket:
- Trade multiple instruments
- Spread across sectors
- Mix timeframes

## The 6% Rule

Never have more than 6% of your account at risk across all open positions.

## Emotional Control

- Stick to your plan
- Don''t chase losses
- Take breaks after losses
- Keep a trading journal', 45, 2, ARRAY['risk', 'basics', 'essential']),

('technical-001', 'Chart Patterns Basics', 'technical_analysis', 'intermediate', 'Learn to identify and trade common chart patterns', '# Chart Patterns

## Support and Resistance

The foundation of technical analysis.

**Support**: Price level where buying pressure prevents further decline
**Resistance**: Price level where selling pressure prevents further advance

## Trend Lines

- **Uptrend**: Series of higher highs and higher lows
- **Downtrend**: Series of lower highs and lower lows
- **Sideways**: Range-bound movement

## Common Patterns

### 1. Head and Shoulders
Reversal pattern signaling trend change

### 2. Double Top/Bottom
Reversal patterns at key levels

### 3. Triangles
- Ascending (bullish)
- Descending (bearish)
- Symmetrical (continuation)

### 4. Flags and Pennants
Short-term continuation patterns

## Volume Confirmation

Patterns are more reliable when confirmed by volume:
- Breakouts should have high volume
- Pullbacks should have low volume', 60, 10, ARRAY['technical', 'charts', 'patterns']),

('futures-001', 'Introduction to Futures Trading', 'futures', 'intermediate', 'Understanding futures contracts and how to trade them', '# Futures Trading

## What are Futures?

Futures contracts are agreements to buy or sell an asset at a predetermined price on a specific future date.

## Key Features

### Leverage
Futures require only a fraction of contract value (margin)

Example:
- ES Contract: $50 x 5000 = $250,000 notional value
- Initial Margin: ~$13,200
- Leverage: ~19x

### Contract Specifications
- **Symbol**: ES (S&P 500 E-mini)
- **Multiplier**: $50 per point
- **Tick Size**: 0.25 points
- **Tick Value**: $12.50
- **Trading Hours**: 23 hours/day

## Popular Futures

1. **ES**: S&P 500 E-mini
2. **NQ**: NASDAQ 100 E-mini
3. **YM**: Dow Jones E-mini
4. **RTY**: Russell 2000 E-mini
5. **CL**: Crude Oil
6. **GC**: Gold

## Margin Requirements

- **Initial Margin**: Required to open position
- **Maintenance Margin**: Minimum to keep position open
- **Day Trade Margin**: Reduced requirement for intraday

## Risk Management

Futures are highly leveraged. Key rules:
- Never use full leverage
- Always use stop losses
- Start with 1 contract
- Trade liquid contracts

## Contract Months

Most futures trade quarterly cycles:
- March (H)
- June (M)
- September (U)
- December (Z)', 90, 20, ARRAY['futures', 'leverage', 'contracts']),

('strategy-001', 'Building a Trading Plan', 'strategy', 'intermediate', 'Create a comprehensive trading plan', '# Building Your Trading Plan

## Components of a Trading Plan

### 1. Market Selection
What will you trade?
- Stocks
- Futures
- Options
- Mix

### 2. Time Frame
- Day trading (minutes to hours)
- Swing trading (days to weeks)
- Position trading (weeks to months)

### 3. Entry Rules
Define exactly when you enter:
- Technical setup
- Confirmation signals
- Time of day

### 4. Exit Rules
Both wins AND losses:
- Profit targets
- Stop losses
- Time stops

### 5. Position Sizing
How much to risk per trade

### 6. Risk Management
- Max risk per trade: 1-2%
- Max total risk: 6%
- Max consecutive losses: 3

## Example Day Trading Plan

**Market**: ES Futures
**Time Frame**: 15-minute charts
**Session**: 9:30 AM - 12:00 PM EST
**Setups**: Pullbacks to moving average
**Entry**: Touch MA + reversal candle
**Stop**: Below recent swing low
**Target**: 2:1 reward/risk
**Position Size**: 1 contract
**Max Trades**: 3 per day

## Track and Improve

Review trades weekly:
- What worked?
- What didn''t?
- Emotional state?
- Lessons learned?

Update plan quarterly based on results.', 60, 30, ARRAY['strategy', 'planning', 'system']);

-- Seed Economic Events (sample data for next 7 days)
INSERT INTO economic_events (event_name, country, category, importance, scheduled_date, scheduled_time, forecast_value, previous_value, currency) VALUES
('Consumer Price Index (CPI)', 'US', 'inflation', 'high', CURRENT_DATE + INTERVAL '1 day', '08:30:00', '0.3%', '0.2%', 'USD'),
('Federal Reserve Interest Rate Decision', 'US', 'policy', 'high', CURRENT_DATE + INTERVAL '2 days', '14:00:00', '5.50%', '5.50%', 'USD'),
('Non-Farm Payrolls', 'US', 'employment', 'high', CURRENT_DATE + INTERVAL '3 days', '08:30:00', '180K', '175K', 'USD'),
('Retail Sales', 'US', 'economic_growth', 'medium', CURRENT_DATE + INTERVAL '4 days', '08:30:00', '0.4%', '0.6%', 'USD'),
('Initial Jobless Claims', 'US', 'employment', 'medium', CURRENT_DATE + INTERVAL '5 days', '08:30:00', '210K', '205K', 'USD'),
('GDP Growth Rate', 'US', 'economic_growth', 'high', CURRENT_DATE + INTERVAL '6 days', '08:30:00', '2.8%', '2.5%', 'USD'),
('PMI Manufacturing', 'US', 'business_activity', 'medium', CURRENT_DATE + INTERVAL '7 days', '10:00:00', '52.0', '51.8', 'USD'),
('Core PCE Price Index', 'US', 'inflation', 'high', CURRENT_DATE + INTERVAL '7 days', '08:30:00', '0.3%', '0.3%', 'USD');

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS idx_trade_journal_user_date ON trade_journal(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_learning_progress_user ON learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_economic_events_date ON economic_events(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
