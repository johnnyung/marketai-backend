import { pool } from "../../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


// --- THE GOLDEN MANIFEST (v113-F2) ---
// Defines exactly what MUST exist for the engines to work.
const GOLDEN_SCHEMA: Record<string, Record<string, string>> = {
  // Core
  'users': { 'id': 'integer', 'email': 'character varying', 'role': 'character varying' },
  'portfolios': { 'id': 'integer', 'user_id': 'integer', 'current_cash': 'numeric' },
  'stock_positions': { 'id': 'integer', 'ticker': 'character varying', 'unrealized_pnl': 'numeric' },
  'trades': {
      'asset_type': 'character varying',
      'strategy_tag': 'character varying',
      'price': 'numeric',
      'ticker': 'character varying'
  },

  // Ingestion Cortex
  'raw_data_collection': { 'source_type': 'character varying', 'data_json': 'jsonb' },
  'digest_entries': {
      'embedding_vector': 'ARRAY',
      'anomaly_score': 'integer',
      'anomaly_type': 'character varying',
      'ai_summary': 'text'
  },
  
  // Deep Brain & Execution (PHFA Enhanced)
  'ai_stock_tips': {
      'decision_matrix': 'jsonb',
      'phfa_data': 'jsonb', // <--- NEW CRITICAL COLUMN
      'tribunal_data': 'jsonb',
      'insider_data': 'jsonb',
      'macro_data': 'jsonb',
      'volatility_profile': 'character varying',
      'allocation_pct': 'numeric',
      'signal_expiry': 'timestamp without time zone'
  },
  'historical_events': { 'recovery_pattern': 'text', 'affected_sectors': 'jsonb' },
  
  // Advanced Engines
  'gamma_snapshots': { 'ticker': 'character varying', 'net_gamma': 'numeric', 'regime': 'character varying' },
  'narrative_pressure_logs': { 'ticker': 'character varying', 'pressure_score': 'integer' },
  'insider_intent_logs': { 'ticker': 'character varying', 'classification': 'character varying' },
  'currency_shocks': { 'regime': 'character varying', 'shock_level': 'character varying' },
  'divergence_signals': { 'ticker': 'character varying', 'divergence_type': 'character varying' },
  'regime_snapshots': { 'current_regime': 'character varying', 'probability': 'numeric' },
  'shadow_liquidity_prints': { 'ticker': 'character varying', 'shadow_ratio': 'numeric' }
};

async function audit() {
  console.log("   🔍 Comparing Live DB against Golden Manifest (v113-PHFA)...");
  console.log("----------------------------------------------------------------");
  
  const client = await pool.connect();
  const missingTables: string[] = [];
  const missingColumns: string[] = [];
  const typeMismatches: string[] = [];
  const migrations: string[] = [];

  try {
    // 1. FETCH ALL TABLES
    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const liveTables = new Set(tablesRes.rows.map(r => r.table_name));

    // 2. CHECK TABLES & COLUMNS
    for (const [table, columns] of Object.entries(GOLDEN_SCHEMA)) {
      if (!liveTables.has(table)) {
        missingTables.push(table);
        // Generate Migration for missing table
        let createSQL = `CREATE TABLE ${table} (id SERIAL PRIMARY KEY, created_at TIMESTAMP DEFAULT NOW()`;
        for (const [col, type] of Object.entries(columns)) {
            let pgType = type === 'number' ? 'numeric' : type;
            if (type === 'ARRAY') pgType = 'float8[]';
            createSQL += `, ${col} ${pgType}`;
        }
        createSQL += `);`;
        migrations.push(createSQL);
        continue;
      }

      // Check Columns
      const colsRes = await client.query(`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = $1
      `, [table]);
      
      const liveCols = new Map(colsRes.rows.map(r => [r.column_name, r.data_type]));
      const liveUdts = new Map(colsRes.rows.map(r => [r.column_name, r.udt_name]));

      for (const [col, expectedType] of Object.entries(columns)) {
        if (!liveCols.has(col)) {
          missingColumns.push(`${table}.${col}`);
          
          // Generate Migration for missing column
          let pgType = expectedType === 'number' ? 'numeric' : expectedType;
          if (expectedType === 'ARRAY') pgType = 'float8[]';
          migrations.push(`ALTER TABLE ${table} ADD COLUMN ${col} ${pgType};`);
        } else {
          // Type Check (Basic)
          const actualType = liveCols.get(col);
          const actualUdt = liveUdts.get(col);
          
          if (expectedType === 'ARRAY' && actualUdt !== '_float8') {
             typeMismatches.push(`${table}.${col} (Expected: float8[], Got: ${actualUdt})`);
          }
        }
      }
    }

    // 3. REPORT
    if (missingTables.length === 0 && missingColumns.length === 0) {
        console.log("   ✅ Schema is 100% Synchronized with PHFA Engine.");
    } else {
        console.log(`   ❌ MISSING TABLES: ${missingTables.length}`);
        console.log(`   ❌ MISSING COLUMNS: ${missingColumns.length}`);
        if (migrations.length > 0) {
            console.log("\n   🛠️  APPLYING MIGRATIONS...");
            for (const sql of migrations) {
                await client.query(sql);
                console.log(`      ✓ Executed: ${sql}`);
            }
            console.log("   ✅ Schema Repaired.");
        }
    }

  } catch (e: any) {
    console.error("   ❌ Audit Error:", e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

audit();
