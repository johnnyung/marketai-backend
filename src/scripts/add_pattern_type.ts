import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();


async function migrate() {
  console.log('🔄 Adding "pattern_type" column to correlation_patterns...');
  try {
    await pool.query(`
      ALTER TABLE correlation_patterns
      ADD COLUMN IF NOT EXISTS pattern_type VARCHAR(100) DEFAULT 'general';
    `);
    console.log('   ✅ Column added successfully.');
    
    // Update existing records to have a default type
    await pool.query(`
      UPDATE correlation_patterns
      SET pattern_type = 'general'
      WHERE pattern_type IS NULL;
    `);
    console.log('   ✅ Existing records updated.');
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
