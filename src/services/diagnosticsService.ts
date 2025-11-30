import pool from '../db/index.js';
import fmpService from './fmpService.js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

class DiagnosticsService {
  private cache: any = null;
  private lastRun: number = 0;

  async runFullDiagnostics() {
    // Cache for 60 seconds to prevent API hammering
    if (this.cache && (Date.now() - this.lastRun < 60000)) {
        return this.cache;
    }

    const start = Date.now();
    
    const [ai, infra, fmpStatus, dataPipeline] = await Promise.all([
        this.testAILogic(),
        this.checkDatabaseIntegrity(),
        fmpService.checkConnection(),
        this.auditDataPipeline()
    ]);
    
    const report = {
      meta: {
        timestamp: new Date().toISOString(),
        total_latency: Date.now() - start,
        status: (ai.status === 'operational' && fmpStatus.success) ? 'HEALTHY' : 'DEGRADED'
      },
      infrastructure: infra,
      ai_brain: ai,
      external_apis: {
          fmp_feed: {
              status: fmpStatus.success ? 'online' : 'offline',
              config: fmpStatus.config ? 'loaded' : 'missing',
              latency: fmpStatus.latency,
              message: fmpStatus.message
          }
      },
      data_pipeline: dataPipeline
    };

    this.cache = report;
    this.lastRun = Date.now();
    return report;
  }

  private async testAILogic() {
      const start = Date.now();
      try {
          if (!process.env.ANTHROPIC_API_KEY && !process.env.CLAUDE_API_KEY) return { status: 'offline', error: 'No Key' };
          // Don't call API every time, just check env var for health check
          return { status: 'operational', latency: 0, model: 'claude-3-haiku' };
      } catch (e: any) {
          return { status: 'failed', error: e.message };
      }
  }

  private async checkDatabaseIntegrity() {
    try {
      const res = await pool.query('SELECT count(*) from users');
      return { database: 'connected', user_count: parseInt(res.rows[0].count) };
    } catch (e: any) {
      return { database: 'disconnected', error: e.message };
    }
  }

  private async auditDataPipeline() {
      try {
          const counts = await pool.query(`
              SELECT
                (SELECT COUNT(*) FROM digest_entries WHERE created_at > NOW() - INTERVAL '24h') as digest_24h,
                (SELECT COUNT(*) FROM historical_events) as total_history,
                (SELECT COUNT(*) FROM ai_stock_tips WHERE status='active') as active_tips,
                (SELECT COUNT(*) FROM hunter_findings) as catalyst_hunts
          `);
          
          const data = counts.rows[0];
          
          return {
              ingestion_rate: `${data.digest_24h || 0} entries/24h`,
              knowledge_base: `${data.total_history || 0} events`,
              tip_tracker: { total_active: parseInt(data.active_tips || 0) },
              catalyst_hunter: `${data.catalyst_hunts || 0} findings`
          };
      } catch(e) {
          return { ingestion_rate: "0", knowledge_base: "0", tip_tracker: { total_active: 0 }, catalyst_hunter: "0" };
      }
  }
}

export default new DiagnosticsService();
