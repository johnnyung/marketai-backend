import { pool } from '../db/index.js';

async function run() {
  console.log("🔍 Checking Database Connection...");
  try {
    const client = await pool.connect();
    console.log("✅ Connection Established.");

    const res = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const tables = res.rows.map(r => r.table_name);
    console.log(`📊 Found ${tables.length} tables.`);
    
    // Check for specific tables that define your production data
    if (tables.includes('ai_stock_tips') || tables.includes('user_portfolios')) {
        console.log("🚀 SUCCESS: Connected to the ORIGINAL database (Production Data Found).");
        console.log("   Tables found:", tables.join(', '));
    } else if (tables.length < 3) {
        console.log("⚠️  WARNING: Database looks EMPTY. You are likely still on the wrong instance.");
    } else {
        console.log("ℹ️  Tables found:", tables.join(', '));
    }
    
    client.release();
    process.exit(0);
  } catch (e: any) {
    console.error("❌ Connection Failed:", e.message);
    process.exit(1);
  }
}

run();
