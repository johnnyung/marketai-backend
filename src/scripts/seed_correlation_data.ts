import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Known correlations to "teach" the AI immediately
const KNOWN_PATTERNS = [
  { driver: 'BTC', target: 'MSTR', beta: 1.8, corr: 0.92 }, // MSTR moves 1.8x BTC
  { driver: 'BTC', target: 'COIN', beta: 1.2, corr: 0.85 },
  { driver: 'BTC', target: 'MARA', beta: 2.1, corr: 0.88 }, // Miners are volatile
  { driver: 'ETH', target: 'NVDA', beta: 0.6, corr: 0.45 }, // Loose tech correlation
  { driver: 'BTC', target: 'SQ',   beta: 0.8, corr: 0.65 },
  { driver: 'BTC', target: 'HOOD', beta: 0.7, corr: 0.60 },
  { driver: 'BTC', target: 'RIOT', beta: 2.3, corr: 0.89 }
];

async function seed() {
  console.log('🧠 Seeding Correlation Memory...');
  
  try {
    // 1. Clear old patterns
    await pool.query('DELETE FROM correlation_patterns');

    // 2. Insert Known Patterns
    for (const p of KNOWN_PATTERNS) {
      await pool.query(`
        INSERT INTO correlation_patterns
        (driver_asset, target_asset, correlation_coefficient, beta_coefficient, win_rate)
        VALUES ($1, $2, $3, $4, $5)
      `, [p.driver, p.target, p.corr, p.beta, 85.5]);
    }
    console.log('   ✅ Injected 7 Core Correlation Patterns');

    // 3. Simulate 6 Months of Weekend History
    // This gives the "History" chart on the frontend something to show
    console.log('   ⏳ Generating 24 weeks of historical weekend moves...');
    const assets = ['MSTR', 'COIN', 'MARA'];
    
    for (let i = 0; i < 24; i++) {
       const isBullish = Math.random() > 0.4;
       const btcMove = (Math.random() * 5) * (isBullish ? 1 : -1); // +/- 0-5%
       
       for (const ticker of assets) {
           const beta = KNOWN_PATTERNS.find(p => p.target === ticker)?.beta || 1.5;
           const stockMove = btcMove * beta * (0.8 + Math.random() * 0.4); // Add noise
           
           await pool.query(`
             INSERT INTO market_correlation_history
             (date, asset_type, symbol, weekend_change_pct, monday_open)
             VALUES (NOW() - INTERVAL '${i} weeks', 'stock', $1, $2, 0)
           `, [ticker, stockMove]);
       }
    }
    console.log('   ✅ Historical data seeded.');

  } catch (e) {
    console.error('❌ Seeding Failed:', e);
  } finally {
    await pool.end();
  }
}

seed();
