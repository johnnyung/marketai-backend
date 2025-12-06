import { pool } from "../db/index.js";
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();


async function seed() {
  console.log('🔌 Connecting to DB...');
  
  try {
    // 1. Update Schema
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
    `);
    console.log('   ✅ Schema Updated (is_verified, role)');

    // 2. Create Admins
    const SALT_ROUNDS = 10;
    const admins = [
        { email: 'johnny@jeeniemedia.com', pass: 'marketai2025!', name: 'Johnny' },
        { email: 'admin@marketai.com',     pass: 'admin123',      name: 'System Admin' }
    ];

    for (const admin of admins) {
        const hash = await bcrypt.hash(admin.pass, SALT_ROUNDS);
        
        // Upsert (Insert or Update password if exists)
        await pool.query(`
            INSERT INTO users (email, password_hash, username, is_verified, role, created_at)
            VALUES ($1, $2, $3, TRUE, 'admin', NOW())
            ON CONFLICT (email)
            DO UPDATE SET
                password_hash = $2,
                is_verified = TRUE,
                role = 'admin'
        `, [admin.email, hash, admin.name]);
        
        console.log(`   👤 Admin Synced: ${admin.email}`);
    }

  } catch (e: any) {
    console.error('❌ Admin Seed Failed:', e.message);
  } finally {
    await pool.end();
  }
}

seed();
