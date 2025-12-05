import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function seed() {
    console.log("   🌱 Seeding Agent Reliability Snapshots...");
    const agents = ['Momentum', 'Value', 'Catalyst', 'ShadowLiquidity', 'FSIFundamentals', 'InsiderIntent', 'GammaExposure'];
    
    for (const agent of agents) {
        await pool.query(`
            INSERT INTO agent_reliability_snapshots
            (agent_name, win_rate, reliability_multiplier, consistency_score, snapshot_date)
            VALUES ($1, 65.0, 1.05, 80, CURRENT_DATE)
            ON CONFLICT (agent_name, snapshot_date) DO NOTHING
        `, [agent]);
    }
    console.log("   ✅ Reliability Data Seeded.");
    process.exit(0);
}

seed();
