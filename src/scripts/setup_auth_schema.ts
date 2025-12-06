import "dotenv/config";     // <---- loads .env automatically
import { pool } from "../db/index.js";

async function setupAuthSchema() {
  console.log("======================================");
  console.log("  MARKETAI — AUTH SCHEMA MIGRATION");
  console.log("======================================");

  console.log("🔌 Using DATABASE_URL:", process.env.DATABASE_URL);

  if (!process.env.DATABASE_URL) {
    throw new Error("❌ DATABASE_URL missing in environment");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    console.log("🔧 Applying schema changes...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        is_verified BOOLEAN DEFAULT false,
        verification_token TEXT,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("✅ Schema aligned");
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration error:", err);
  } finally {
    client.release();
  }

  console.log("======================================");
  console.log("  ✅ AUTH SCHEMA MIGRATION COMPLETE");
  console.log("======================================");
}

setupAuthSchema().catch(console.error);
