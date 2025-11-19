-- Update ai_stock_tips table for 3-tier opportunity system

-- Add new columns
ALTER TABLE ai_stock_tips 
ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'blue_chip',
ADD COLUMN IF NOT EXISTS entry_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS target_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS stop_loss DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS expected_gain_percent DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS risk_score INTEGER,
ADD COLUMN IF NOT EXISTS timeframe VARCHAR(50),
ADD COLUMN IF NOT EXISTS catalysts JSONB,
ADD COLUMN IF NOT EXISTS exit_strategy TEXT;

-- Create index on tier
CREATE INDEX IF NOT EXISTS idx_tips_tier ON ai_stock_tips(tier, status);
CREATE INDEX IF NOT EXISTS idx_tips_risk ON ai_stock_tips(risk_score, expected_gain_percent);
