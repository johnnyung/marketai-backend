import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


class SchemaHarmonizerService {
  async syncSchema() {
    console.log("   🛡️  Schema Harmonizer: Verifying Deep Brain Data Structures...");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // AI Tips & Tracking
        await this.ensureColumn(client, 'ai_stock_tips', 'decision_matrix', 'JSONB');
        await this.ensureColumn(client, 'ai_stock_tips', 'tribunal_data', 'JSONB');
        await this.ensureColumn(client, 'ai_stock_tips', 'insider_data', 'JSONB');
        await this.ensureColumn(client, 'ai_stock_tips', 'macro_data', 'JSONB');
        await this.ensureColumn(client, 'ai_stock_tips', 'volatility_profile', 'VARCHAR(20)');
        await this.ensureColumn(client, 'ai_stock_tips', 'allocation_pct', 'DECIMAL');
        
        // Trades
        await this.ensureColumn(client, 'trades', 'asset_type', "VARCHAR(20) DEFAULT 'stock'");
        await this.ensureColumn(client, 'trades', 'strategy_tag', "VARCHAR(50)");
        
        // Digest
        await this.ensureColumn(client, 'digest_entries', 'embedding_vector', 'FLOAT8[]');
        await this.ensureColumn(client, 'digest_entries', 'anomaly_score', 'INTEGER DEFAULT 0');
        await this.ensureColumn(client, 'digest_entries', 'anomaly_type', "VARCHAR(50) DEFAULT 'standard'");

        // 4. New Engine Tables (Auto-Create if missing)
        await client.query(`
            CREATE TABLE IF NOT EXISTS crypto_stock_predictions (
                id SERIAL PRIMARY KEY,
                prediction_date TIMESTAMP,
                crypto_weekend_change DECIMAL,
                predicted_direction VARCHAR(20),
                confidence_score DECIMAL,
                high_correlation_tickers JSONB,
                status VARCHAR(20),
                actual_market_change DECIMAL,
                prediction_correct BOOLEAN,
                ticker_accuracy DECIMAL,
                validated_at TIMESTAMP
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS unified_intelligence_alerts (
                id SERIAL PRIMARY KEY,
                alert_type VARCHAR(50),
                severity VARCHAR(20),
                title TEXT,
                description TEXT,
                confidence DECIMAL,
                data_sources JSONB,
                affected_tickers JSONB,
                historical_precedent JSONB,
                action_items JSONB,
                timestamp TIMESTAMP,
                acknowledged BOOLEAN DEFAULT FALSE
            );
        `);

        await client.query('COMMIT');
    } catch (e: any) {
        await client.query('ROLLBACK');
        console.error("Schema Sync Failed:", e.message);
    } finally {
        client.release();
    }
  }

  private async ensureColumn(client: any, table: string, column: string, type: string) {
      try {
          await client.query(`
              ALTER TABLE ${table}
              ADD COLUMN IF NOT EXISTS ${column} ${type}
          `);
      } catch(e) { /* Ignore if exists */ }
  }
}

export default new SchemaHarmonizerService();
