import 'dotenv/config';
import agentReliabilityService from '../services/agentReliabilityService.js';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function run() {
  console.log("🕒 STARTING AGENT RELIABILITY JOB...");
  const start = Date.now();
  
  try {
    const result = await agentReliabilityService.runReliabilityAnalysis();
    const duration = (Date.now() - start) / 1000;
    
    console.log("------------------------------------------------");
    console.log(`✅ JOB COMPLETE in ${duration}s`);
    console.log(`   Processed: ${result.processed} trades`);
    console.log("------------------------------------------------");
    
    process.exit(0);
  } catch (e: any) {
    console.error("🚨 JOB CRASHED:", e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
