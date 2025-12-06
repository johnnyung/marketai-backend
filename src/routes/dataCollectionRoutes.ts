// src/routes/dataCollectionRoutes.ts
import { Router } from "express";
import { pool } from "../db/index.js";   // <-- unified DB client

const router = Router();

async function ensureTablesExist() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS raw_data_collection (
      id SERIAL PRIMARY KEY,
      symbol TEXT,
      data JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id SERIAL PRIMARY KEY,
      symbol TEXT,
      alert_type TEXT,
      triggered_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

ensureTablesExist().catch(err => {
  console.error("❌ Table creation error:", err);
});

export default router;
