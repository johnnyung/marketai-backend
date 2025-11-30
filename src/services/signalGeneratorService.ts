import { Pool } from 'pg';
import marketDataService from './marketDataService.js';
import technicalIndicatorsService from './technicalIndicatorsService.js';
import fmpService from './fmpService.js';
import confidenceAdjustmentService from './confidenceAdjustmentService.js';
import riskValidatorService from './riskValidatorService.js';
import portfolioManagerService from './portfolioManagerService.js';
import volatilityNormalizerService from './volatilityNormalizerService.js';
import corporateQualityService from './corporateQualityService.js';
import paperTradingService from './paperTradingService.js';
import retailInterpretabilityService from './retailInterpretabilityService.js';
import hedgingService from './hedgingService.js';
import tradeArchitectService from './tradeArchitectService.js';
import predictionLoggerService from './predictionLoggerService.js';
import confidenceRecalibrationService from './confidenceRecalibrationService.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class SignalGeneratorService {
  
  async processDeepBrainRecommendations(analysis: any) {
    console.log('   💰 Processing Signals with PHFA Layer...');
    await this.processTipAging();

    const picks: any[] = [];
    if (Array.isArray(analysis)) {
        analysis.forEach(p => picks.push(p));
    } else {
        if (analysis.defensive_sector?.picks) this.ingest(picks, analysis.defensive_sector.picks, 'Safe & Steady', 'blue_chip');
        if (analysis.growth_sectors) analysis.growth_sectors.forEach((s: any) => { if(s.picks) this.ingest(picks, s.picks, 'High Growth', 'explosive_growth') });
        if (analysis.crypto_unicorns) this.ingest(picks, analysis.crypto_unicorns, 'Crypto', 'crypto_alpha');
        if (analysis.insider_plays) this.ingest(picks, analysis.insider_plays, 'Insider', 'insider_play');
    }

    const hedge = await hedgingService.calculateHedge(picks);
    if (hedge) picks.push({ ...hedge, tier: 'sector_play', category: 'Portfolio Protection', decision_matrix: { type: 'HEDGE', reason: hedge.reason } });

    await pool.query("UPDATE ai_stock_tips SET status = 'archived' WHERE status = 'active'");

    const tickers = picks.map(p => p.ticker).filter(t => t);
    const pricesMap = await marketDataService.getMultiplePrices(tickers);
    
    let publishedCount = 0;

    for (const pick of picks) {
        if(!pick.ticker) continue;
        const ticker = pick.ticker.toUpperCase().trim();
        const quote = pricesMap.get(ticker);
        let price = quote ? quote.price : 0;
        
        if (!price) {
             const retry = await marketDataService.getStockPrice(ticker);
             if (retry) price = retry.price;
        }

        if (!price || price <= 0) continue;

        let status = 'active';
        let reason = pick.reason;
        let action = pick.action || 'BUY';
        let confidence = pick.confidence || 80;
        let matrix = pick.decision_matrix || {};

        if (!matrix.health) {
             const health = await corporateQualityService.analyzeHealth(ticker);
             if (!health.passed) { action = 'WATCH'; confidence = 10; reason = `⛔ [HEALTH FAIL] ${health.flags.join(', ')}`; }
             matrix.health = health;
        }

        const norm = await volatilityNormalizerService.normalize(confidence);
        confidence = norm.adjusted_score;

        const volProfile = (await technicalIndicatorsService.getTechnicalIndicators(ticker))?.momentumProfile || 'Medium';

        const tradePlan = await tradeArchitectService.constructPlan(
            ticker, price, confidence, volProfile, pick.tier, matrix.engines || {}
        );

        const badges = retailInterpretabilityService.generateSimpleTags({ ...pick, ...matrix, action, confidence, tier: pick.tier });
        const eli12 = retailInterpretabilityService.generateELI12({ ...pick, ...matrix, action, confidence, ticker });
        
        matrix.retail_badges = badges;
        matrix.eli12_explanation = eli12;
        
        await this.saveToDB(pick, price, action, reason, status, new Date(Date.now()+5*86400000), volProfile, tradePlan.allocation_percent, confidence, tradePlan, matrix);
        
        if (status === 'active' && action === 'BUY') {
            await predictionLoggerService.logPrediction({
                ticker, confidence, entry_primary: tradePlan.entry_primary, stop_loss: tradePlan.stop_loss,
                take_profit_1: tradePlan.take_profit_1, take_profit_2: tradePlan.take_profit_2, take_profit_3: tradePlan.take_profit_3,
                agent_signals: matrix.engines || {}
            });
            publishedCount++;
        }
    }
    
    console.log(`   ✅ Published ${publishedCount} PHFA-Enhanced Signals & Logged to POT.`);
    if (publishedCount > 0) await paperTradingService.runCycle();
  }

  // --- RESTORED METHOD ---
  async generateComprehensiveTips() {
      try {
          const engine = (await import('./comprehensiveDataEngine.js')).default;
          await engine.runComprehensiveCollection();
          return await this.getLatestSignals();
      } catch (e: any) {
          console.error("   ❌ Comprehensive Trigger Failed:", e.message);
          return [];
      }
  }

  async getLatestSignals(limit: number = 50) {
      const res = await pool.query("SELECT * FROM ai_stock_tips WHERE status='active' ORDER BY tier, confidence DESC");
      
      const enhanced = await Promise.all(res.rows.map(async (row) => {
          const matrix = row.decision_matrix || {};
          const engines = matrix.engines || {};

          const recal = await confidenceRecalibrationService.recalibrate(
              50, engines.agents, engines.fsi, engines.narrative, engines.shadow, engines.regime
          );
          
          const agentRes = await pool.query("SELECT agent_name, win_rate FROM agent_reliability_snapshots WHERE snapshot_date = CURRENT_DATE");
          
          return {
              ...row,
              confidence_reasons: [
                  recal.reason,
                  `FSI Health: ${engines.fsi?.traffic_light || 'N/A'}`,
                  `Regime: ${engines.regime?.current_regime || 'N/A'}`,
                  `Shadow Bias: ${engines.shadow?.bias || 'N/A'}`
              ],
              agent_reliability_scores: agentRes.rows,
              fsi_factors: engines.fsi,
              narrative_trend_alignment: (engines.narrative?.pressure_score || 0) > 60 ? 'ALIGNED' : 'NEUTRAL',
              shadow_liquidity_alignment: engines.shadow?.bias || 'NEUTRAL',
              phfa_data: row.phfa_data
          };
      }));

      return enhanced;
  }
  
  async generateDailySignals() { return this.getLatestSignals(); }
  
  private async processTipAging() { await pool.query("UPDATE ai_stock_tips SET status = 'expired' WHERE status IN ('active', 'watch_only') AND signal_expiry < NOW()"); }
  private ingest(target: any[], source: any[], cat: string, tier: string) { if(source) source.forEach(p => target.push({ ...p, category: cat, tier })); }
  private async saveToDB(pick: any, price: number, action: string, reason: string, status: string, expiry: Date, volProfile: string, allocation: number, confidence: number, plan: any, matrix: any) {
      try {
        await pool.query(`
          INSERT INTO ai_stock_tips
          (ticker, company_name, action, tier, entry_price, target_price, stop_loss,
           expected_gain_percent, confidence, reasoning, status, created_at, signal_expiry,
           volatility_profile, allocation_pct, kelly_score, decision_matrix, phfa_data)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, $13, $14, $15, $16, $17)
        `, [pick.ticker, pick.category, action, pick.tier, price, plan.take_profit_1, plan.stop_loss, ((plan.take_profit_1 - price)/price)*100, confidence, reason, status, expiry, volProfile, allocation, 0, JSON.stringify(matrix), JSON.stringify(plan)]);
      } catch(e) { console.error(`DB Error ${pick.ticker}`); }
  }
}

export default new SignalGeneratorService();
