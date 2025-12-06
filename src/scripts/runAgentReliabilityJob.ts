import { pool } from "../db/index.js";
import 'dotenv/config';
import agentReliabilityService from '../services/agentReliabilityService.js';
import { Pool } from 'pg';


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
