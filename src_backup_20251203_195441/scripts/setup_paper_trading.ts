import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  console.log('🏦 Setting up Paper Trading Architecture...');
  
  try {
    // 1. Stock Positions Table (Live Holdings)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_positions (
        id SERIAL PRIMARY KEY,
        portfolio_id INTEGER REFERENCES portfolios(id),
        ticker VARCHAR(10) NOT NULL,
        shares DECIMAL NOT NULL,
        avg_entry_price DECIMAL NOT NULL,
        current_price DECIMAL,
        unrealized_pnl DECIMAL,
        cost_basis DECIMAL,
        market_value DECIMAL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('   ✅ Created stock_positions table');

    // 2. Trades Table (Historical Ledger)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trades (
        id SERIAL PRIMARY KEY,
        portfolio_id INTEGER REFERENCES portfolios(id),
        ticker VARCHAR(10),
        action VARCHAR(10), -- BUY, SELL
        shares DECIMAL,
        price DECIMAL,
        total_amount DECIMAL,
        reason VARCHAR(255),
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('   ✅ Created trades table');

    // 3. Update AI Tips Table (Link logic to execution)
    await pool.query(`
      ALTER TABLE ai_stock_tips
      ADD COLUMN IF NOT EXISTS is_executed BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS execution_price DECIMAL,
      ADD COLUMN IF NOT EXISTS execution_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS position_id INTEGER;
    `);
    console.log('   ✅ Linked ai_stock_tips to execution engine');

    // 4. Create System Portfolio (The "Paper Wallet")
    const res = await pool.query(`
        INSERT INTO portfolios (user_id, name, type, starting_cash, current_cash)
        SELECT 1, 'AI_PAPER_TRADING', 'SYSTEM', 100000, 100000
        WHERE NOT EXISTS (SELECT 1 FROM portfolios WHERE name = 'AI_PAPER_TRADING')
        RETURNING id;
    `);
    
    if (res.rows.length > 0) {
        console.log(`   ✅ Created System Portfolio (ID: ${res.rows[0].id})`);
    } else {
        console.log('   ℹ️  System Portfolio already active.');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Setup Failed:', error.message);
    process.exit(1);
  }
}

migrate();
