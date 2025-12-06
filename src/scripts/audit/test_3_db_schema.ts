import { pool } from "../../db/index.js";
import { Pool } from 'pg';
import 'dotenv/config';


const TABLES = [
    'ai_stock_tips', 'trades', 'digest_entries', 'historical_events',
    'gamma_snapshots', 'narrative_pressure_logs', 'insider_intent_logs',
    'currency_shocks', 'divergence_signals', 'regime_snapshots',
    'shadow_liquidity_prints', 'system_status'
];

async function run() {
    console.log("💾 TEST 3: DB SCHEMA INTEGRITY...");
    let missing = 0;

    try {
        for (const table of TABLES) {
            const res = await pool.query(`SELECT to_regclass($1) as exists`, [table]);
            if (res.rows[0].exists) {
                console.log(`   ✅ Table: ${table}`);
            } else {
                console.log(`   ❌ MISSING: ${table}`);
                missing++;
            }
        }
    } catch (e: any) {
        console.error("   ❌ DB Connection Failed:", e.message);
        missing++;
    } finally {
        await pool.end();
    }
    process.exit(missing > 0 ? 1 : 0);
}
run();
