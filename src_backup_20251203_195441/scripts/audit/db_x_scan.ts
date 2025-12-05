import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
    try {
        const tables = ['ai_stock_tips', 'trades', 'digest_entries', 'historical_events', 'correlation_patterns'];
        for (const t of tables) {
            const res = await pool.query(`SELECT to_regclass($1)`, [t]);
            if (!res.rows[0].to_regclass) throw new Error(`Missing table ${t}`);
        }
        console.log("✅ DB Schema Verified");
        process.exit(0);
    } catch (e: any) {
        console.error("❌ DB Check Failed:", e.message);
        process.exit(1);
    }
}
run();
