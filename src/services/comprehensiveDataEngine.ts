import pool from '../db/index.js';
import aiTipGenerator from './aiTipGenerator.js';
import liveStatusService from './liveStatusService.js';

// --- CORE SERVICES ---
import catalystHunterService from './catalystHunterService.js';
import macroRegimeService from './macroRegimeService.js';
import socialSentimentService from './socialSentimentService.js';
import tradeManagementService from './tradeManagementService.js';
import marketDataService from './marketDataService.js';
import tribunalService from './tribunalService.js';
import gammaExposureService from './gammaExposureService.js';
import insiderIntentService from './insiderIntentService.js';
import narrativePressureService from './narrativePressureService.js';
import currencyShockService from './currencyShockService.js';
import divergenceDetectorService from './divergenceDetectorService.js';
import multiAgentValidationService from './multiAgentValidationService.js';
import marketSentimentService from './marketSentimentService.js';
import shadowLiquidityService from './shadowLiquidityService.js';
import regimeTransitionService from './regimeTransitionService.js';
import riskConstraintService from './riskConstraintService.js';
import sectorDiscoveryService from './sectorDiscoveryService.js';
import expandedSocialService from './expandedSocialService.js';
import retailInterpretabilityService from './retailInterpretabilityService.js';
import storyModeService from './storyModeService.js';
import tradeArchitectService from './tradeArchitectService.js';
import technicalIndicatorsService from './technicalIndicatorsService.js';
import financialHealthService from './financialHealthService.js';
import confidenceRecalibrationService from './confidenceRecalibrationService.js';
import volatilityShockAwarenessService from './volatilityShockAwarenessService.js';
import reversalTrapService from './reversalTrapService.js';
import smcwLearningService from './smcwLearningService.js';
import wdiwaAttributionService from './wdiwaAttributionService.js';
import confidenceDriftService from './confidenceDriftService.js'; // POT PHASE 12
import fmpService from './fmpService.js';

class ComprehensiveDataEngine {
  
  async runComprehensiveCollection() {
    console.log('🧠 STARTING V113.0-FSI ALPHA ENGINE...');
    
    await liveStatusService.update('ai_analyst', 'scanning', 'Phase 1: Ingestion');
    await (await import('./masterIngestionService.js')).default.runFullIngestion();
    
    try {
      const universe = await sectorDiscoveryService.getExpandedUniverse();
      const shuffled = universe.sort(() => 0.5 - Math.random());
      const targetTickers = shuffled.slice(0, 50);

      const trending = await socialSentimentService.getTrendingTickers(20);
      const trendingTickers = trending.map((t: any) => t.ticker);
      
      const analysisSet = [...new Set([...targetTickers, ...trendingTickers])];
      console.log(`   🔍 Deep Brain scanning ${analysisSet.length} diverse tickers...`);

      const hypotheses = analysisSet.map(ticker => ({
          ticker,
          action: 'BUY',
          thesis: `Wide-Net Discovery: Analyzing ${ticker} for potential setups.`,
          base_confidence: 50,
          tier: 'sector_play',
          category: 'Deep Scan'
      }));

      await this.processHypotheses(hypotheses);
      await tradeManagementService.reviewPositions();

      return { success: true, count: hypotheses.length };

    } catch (error: any) {
      console.error('❌ Engine Failed:', error);
      return { success: false, error: error.message };
    }
  }

  async analyzeSpecificTickers(tickers: string[]): Promise<any[]> {
      console.log(`   🔍 Deep Brain: Targeted analysis on ${tickers.length} assets...`);
      
      let regime, sentiment, fxShock, vsa, smcw, cdc;
      try {
          [regime, sentiment, fxShock, vsa, smcw, cdc] = await Promise.all([
              regimeTransitionService.detectRegime().catch(() => ({ current_regime: 'NEUTRAL', favored_sectors: [], avoid_sectors: [] })),
              marketSentimentService.getThermometer().catch(() => ({ regime: 'NEUTRAL' })),
              currencyShockService.analyzeShock().catch(() => ({ shock_level: 'LOW', sector_impacts: { beneficiaries: [], victims: [] } })),
              volatilityShockAwarenessService.getMarketCondition().catch(() => ({ regime: 'NORMAL', confidence_modifier: 1.0 })),
              smcwLearningService.getCurrentSeasonality().catch(() => ({ confidence_modifier: 1.0, is_fomc: false })),
              confidenceDriftService.getDriftCorrection().catch(() => ({ correction_factor: 1.0, status: 'STABLE' })) // POT 12
          ]);
      } catch(e) {
          regime = { current_regime: 'NEUTRAL' }; sentiment = { regime: 'NEUTRAL' }; fxShock = { shock_level: 'LOW' }; vsa = { regime: 'NORMAL', confidence_modifier: 1.0 }; smcw = { confidence_modifier: 1.0, is_fomc: false }; cdc = { correction_factor: 1.0, status: 'STABLE' };
      }

      const results = [];

      for (const ticker of tickers) {
          try {
              const [
                  agents, fractal, tribunal, narrative, insider, gamma, shadow, risk, technicals, fsi, rtd, profile
              ] = await Promise.all([
                  multiAgentValidationService.validate(ticker).catch(() => ({ consensus: 'HOLD', agents: {} })),
                  divergenceDetectorService.analyzeFractals(ticker).catch(() => ({ has_divergence: false })),
                  tribunalService.conductTrial(ticker).catch(() => ({ final_verdict: 'HOLD' })),
                  narrativePressureService.calculatePressure(ticker).catch(() => ({ pressure_score: 50 })),
                  insiderIntentService.analyzeIntent(ticker).catch(() => ({ classification: 'UNKNOWN' })),
                  gammaExposureService.analyze(ticker).catch(() => ({ volatility_regime: 'NEUTRAL' })),
                  shadowLiquidityService.scanShadows(ticker).catch(() => ({ bias: 'NEUTRAL' })),
                  riskConstraintService.checkFit(ticker).catch(() => ({ passed: true })),
                  technicalIndicatorsService.getTechnicalIndicators(ticker).catch(() => ({ momentumProfile: 'Medium' })),
                  financialHealthService.analyze(ticker).catch(() => ({ traffic_light: 'YELLOW', quality_score: 50 })),
                  reversalTrapService.analyzeTrapRisk(ticker, vsa.regime).catch(() => ({ is_trap_zone: false, recommended_buffer: 0 })),
                  fmpService.getCompanyProfile(ticker).catch(() => ({ sector: 'Unknown' }))
              ]);

              let action = 'HOLD';
              let baseConfidence = 50;
              let reason = [];
              
              const sector = profile?.sector || 'Unknown';

              if (tribunal.final_verdict === 'BUY' && agents.consensus.includes('BUY')) {
                  action = 'BUY';
                  baseConfidence = 85;
                  reason.push('Tribunal & Agents Agree');
              } else if (tribunal.final_verdict === 'SELL') {
                  action = 'SELL';
                  baseConfidence = 80;
                  reason.push('Sell Signal');
              }

              if (insider.classification === 'OPPORTUNISTIC') { baseConfidence += 10; reason.push('Insider Buying'); }
              if (shadow.bias === 'ACCUMULATION') { baseConfidence += 10; reason.push('Dark Pool Buying'); }
              if (fractal.has_divergence) { baseConfidence += 5; reason.push('Technical Divergence'); }

              // --- POT PHASE 4 & 9 & 11: RECALIBRATION ---
              const recalibrated = await confidenceRecalibrationService.recalibrate(
                  baseConfidence,
                  agents.agents,
                  fsi,
                  narrative,
                  shadow,
                  regime,
                  'blue_chip',
                  sector
              );

              // --- POT PHASE 7: VSA ADJUSTMENT ---
              let finalConfidence = recalibrated.score * vsa.confidence_modifier;
              if (vsa.confidence_modifier !== 1.0) {
                  reason.push(`(VSA: x${vsa.confidence_modifier})`);
              }

              // --- POT PHASE 10: SMCW ADJUSTMENT ---
              finalConfidence *= smcw.confidence_modifier;
              if (smcw.is_fomc) reason.push("(FOMC Risk)");

              // --- POT PHASE 12: CDC ADJUSTMENT ---
              // The final normalizing touch
              finalConfidence *= cdc.correction_factor;
              if (cdc.status !== 'STABLE') reason.push(`(CDC: ${cdc.status} Correction)`);

              // --- POT PHASE 8: RTD WARNING ---
              if (rtd.is_trap_zone) {
                  reason.push(`(RTD: Trap Risk)`);
              }

              finalConfidence = Math.min(99, Math.max(1, Math.round(finalConfidence)));

              const quote = await marketDataService.getStockPrice(ticker);
              const price = quote ? quote.price : 0;

              const phfaPlan = await tradeArchitectService.constructPlan(
                  ticker, price, finalConfidence, (technicals?.momentumProfile as any) || 'Medium',
                  'sector_play', { gamma, insider, narrative, vsa, rtd, smcw }
              );

              const analysisObj = {
                  ticker,
                  action,
                  confidence: finalConfidence,
                  reasoning: reason.join(', ') || 'Neutral Hold',
                  targetPrice: phfaPlan.take_profit_1,
                  stopLoss: phfaPlan.stop_loss,
                  current_price: price,
                  phfa_data: phfaPlan,
                  analysis: {
                      agents: agents.consensus,
                      tribunal: tribunal.final_verdict,
                      insider: insider.classification,
                      narrative: narrative.pressure_score,
                      shadow: shadow.bias,
                      gamma: gamma.volatility_regime,
                      financials: fsi.traffic_light,
                      volatility: vsa.regime,
                      trap_risk: rtd.is_trap_zone,
                      seasonal_mod: smcw.confidence_modifier,
                      drift_mod: cdc.correction_factor, // NEW
                      sector: sector,
                      story: ''
                  },
                  decision_matrix: {
                      engines: { narrative, shadow, gamma, insider, agents, fractal, regime, fsi, vsa, rtd, smcw, cdc },
                      recalibration: recalibrated
                  },
                  retail_badges: [] as any[]
              };

              analysisObj.retail_badges = retailInterpretabilityService.generateSimpleTags(analysisObj);
              analysisObj.analysis.story = await storyModeService.generateStory(ticker, analysisObj);

              results.push(analysisObj);

          } catch (e: any) {
              console.error(`      ❌ Failed to analyze ${ticker}:`, e.message);
          }
      }
      return results;
  }

  private async processHypotheses(hypotheses: any[]) {
      const results = await this.analyzeSpecificTickers(hypotheses.map(h => h.ticker));
      const validSignals = results.filter(r => r.action !== 'HOLD' && r.confidence > 65);
      
      if (validSignals.length > 0) {
          await aiTipGenerator.processDeepBrainRecommendations(validSignals);
          await liveStatusService.update('ai_analyst', 'new_data', `Signals: ${validSignals.length}`, validSignals.length);
      }
  }
}

export default new ComprehensiveDataEngine();
