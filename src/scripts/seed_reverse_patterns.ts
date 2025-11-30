import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const REVERSE_PATTERNS = [
  { driver: 'QQQ', target: 'BTC', beta: 0.8, corr: 0.75, type: 'equity_spillover' },
  { driver: 'QQQ', target: 'ETH', beta: 0.9, corr: 0.80, type: 'equity_spillover' },
  { driver: 'NVDA', target: 'FET', beta: 0.6, corr: 0.65, type: 'equity_spillover' }, // AI Stock -> AI Crypto
  { driver: 'NVDA', target: 'RNDR', beta: 0.7, corr: 0.70, type: 'equity_spillover' },
  { driver: 'SPY', target: 'BTC', beta: 0.5, corr: 0.60, type: 'equity_spillover' }
];

async function seed() {
  console.log('🌱 Seeding Reverse Correlation Patterns...');
  
  try {
    for (const p of REVERSE_PATTERNS) {
      // Upsert pattern
      const res = await pool.query(`
        SELECT id FROM correlation_patterns
        WHERE driver_asset = $1 AND target_asset = $2
      `, [p.driver, p.target]);

      if (res.rows.length === 0) {
          await pool.query(`
            INSERT INTO correlation_patterns
            (driver_asset, target_asset, correlation_coefficient, beta_coefficient, pattern_type, win_rate, last_updated)
            VALUES ($1, $2, $3, $4, $5, 72.5, NOW())
          `, [p.driver, p.target, p.corr, p.beta, p.type]);
          console.log(`   ✅ Added: ${p.driver} -> ${p.target}`);
      }
    }
    process.exit(0);
  } catch (e: any) {
    console.error('❌ Seeding Failed:', e.message);
    process.exit(1);
  }
}

seed();
