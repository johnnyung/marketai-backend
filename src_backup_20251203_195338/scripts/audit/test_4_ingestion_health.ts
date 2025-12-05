import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
    console.log("📡 TEST 4: INGESTION HEALTH...");
    try {
        const res = await pool.query(`
            SELECT source_id, status, last_updated
            FROM system_status
            WHERE last_updated > NOW() - INTERVAL '24 hours'
        `);
        
        if (res.rows.length === 0) {
            console.log("   ⚠️  No active ingestion in last 24h.");
            process.exit(1);
        }

        console.log(`   ✅ Found ${res.rows.length} active collectors.`);
        res.rows.forEach(r => {
            console.log(`      - ${r.source_id}: ${r.status}`);
        });
        process.exit(0);

    } catch (e: any) {
        console.error("   ❌ Ingestion Check Failed:", e.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}
run();
