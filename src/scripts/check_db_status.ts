import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function check() {
  try {
    console.log('\n📊 DATA INGESTION STATUS:');
    const counts = await pool.query(`
        SELECT
            (SELECT COUNT(*) FROM digest_entries) as total_intel,
            (SELECT COUNT(*) FROM digest_entries WHERE created_at > NOW() - INTERVAL '1 hour') as new_intel_1h,
            (SELECT COUNT(*) FROM historical_events) as long_term_memory,
            (SELECT COUNT(*) FROM research_priorities) as active_learning_topics
    `);
    console.table(counts.rows[0]);

    console.log('\n🧬 ACTIVE LEARNING TOPICS (AI Generated Search Vectors):');
    const topics = await pool.query(`
        SELECT topic, source_hint
        FROM research_priorities
        ORDER BY created_at DESC LIMIT 5
    `);
    console.table(topics.rows);

    console.log('\n💡 ACTIVE SIGNALS (Live on Dashboard):');
    // FIXED: Changed 'ai_confidence' to 'confidence'
    const signals = await pool.query(`
        SELECT ticker, tier, action, confidence, status
        FROM ai_stock_tips
        WHERE status = 'active'
        ORDER BY confidence DESC
    `);
    
    if (signals.rows.length === 0) {
        console.log("   (No active signals yet - System may be in 'Ingestion' phase)");
    } else {
        console.table(signals.rows);
    }

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

check();
