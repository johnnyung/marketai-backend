const { Pool } = require('pg');
require('dotenv').config();

async function verifyRestore() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL is missing from .env");
    process.exit(1);
  }

  console.log("🔌 Connecting to Database...");
  console.log(`   Target Host: ${url.split('@')[1].split(':')[0]}`); // Log host only

  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  try {
    const client = await pool.connect();
    console.log("✅ Connection Established.");

    const tablesRes = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public'
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`📊 Total Tables: ${tables.length}`);
    
    const hasData = tables.includes('ai_stock_tips') || tables.includes('user_portfolios');

    if (hasData) {
        const count = await client.query('SELECT count(*) FROM ai_stock_tips');
        console.log(`   ✅ ai_stock_tips: ${count.rows[0].count} rows`);
        console.log("\n🚀 RESTORE STATUS: SUCCESS (Data Intact)");
    } else {
        console.log("\n⚠️  RESTORE STATUS: EMPTY/WRONG DB");
        console.log("   Tables found:", tables.join(', '));
    }

    client.release();
    await pool.end();
    process.exit(hasData ? 0 : 1);

  } catch (err) {
    console.error("\n❌ Connection Failed:", err.message);
    await pool.end();
    process.exit(1);
  }
}

verifyRestore();
