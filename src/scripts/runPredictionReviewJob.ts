import { pool } from "../db/index.js";
import 'dotenv/config';
import predictionReviewService from '../services/predictionReviewService.js';
import { Pool } from 'pg';

// Database connection for cleanup if needed

async function run() {
  console.log("🕒 STARTING NIGHTLY PREDICTION REVIEW JOB...");
  const start = Date.now();
  
  try {
    const result = await predictionReviewService.runReviewCycle();
    const duration = (Date.now() - start) / 1000;
    
    console.log("------------------------------------------------");
    console.log(`✅ JOB COMPLETE in ${duration}s`);
    console.log(`   Processed: ${result.processed} predictions`);
    console.log(`   Success:   ${result.success}`);
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
