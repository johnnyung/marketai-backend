const { Pool } = require('pg');
require('dotenv').config();

async function check() {
  console.log("🔌 Testing Direct Connection...");
  
  // Force strict SSL settings for Railway Proxy
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Essential for Railway TCP Proxy
    },
    connectionTimeoutMillis: 5000
  });

  try {
    const client = await pool.connect();
    console.log("✅ SSL Handshake Successful!");

    const res = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
    `);

    const tables = res.rows.map(r => r.table_name);
    console.log(`📊 Tables Found: ${tables.length}`);
    
    // Check for specific production tables
    const hasData = tables.includes('ai_stock_tips') || tables.includes('user_portfolios');
    
    if (hasData) {
        console.log("🚀 TARGET CONFIRMED: Connected to Original Database.");
        console.log("   Critical tables found: ai_stock_tips, user_portfolios");
    } else if (tables.length > 0) {
        console.log("⚠️  CONNECTED: Tables exist but critical ones are missing.");
        console.log("   Tables:", tables.join(', '));
    } else {
        console.log("⚠️  CONNECTED: Database is EMPTY (This is likely the wrong one).");
    }

    client.release();
    await pool.end();
    process.exit(hasData ? 0 : 1);

  } catch (err) {
    console.error("❌ Connection Failed:", err.message);
    await pool.end();
    process.exit(1);
  }
}

check();
