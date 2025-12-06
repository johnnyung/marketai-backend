import { pool } from "../db/index.js";
import 'dotenv/config';
import metaCortexService from '../services/metaCortexService.js';
import { Pool } from 'pg';


async function test() {
    console.log("🧪 TESTING META-CORTEX (Self-Diagnosis)...");

    // 1. Run Diagnostics
    const report = await metaCortexService.runDiagnostics();

    console.log(`   🏥 System Health: ${report.health_score}%`);
    console.log(`   📡 Blind Spots: ${report.missing_data_sources.length}`);
    console.log(`   🌡️  Drift Index: ${report.drift_index}`);
    
    if (report.recommended_upgrades.length > 0) {
        console.log("   🔧 Recommendations:");
        report.recommended_upgrades.forEach(r => console.log(`      - ${r}`));
    }

    // 2. Check DB Log
    const res = await pool.query("SELECT * FROM meta_diagnostics_logs ORDER BY run_date DESC LIMIT 1");
    if (res.rows.length > 0) {
        console.log("   ✅ Report Logged to DB");
    } else {
        console.error("   ❌ Failed to log report");
        process.exit(1);
    }

    process.exit(0);
}

test();
