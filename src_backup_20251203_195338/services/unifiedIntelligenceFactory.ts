import { IntelligenceBundle } from '../types/intelligenceBundle.js';
import priceService from './priceService.js';
import tickerUniverseService from './tickerUniverseService.js';
import { adaptForTopPicks } from '../utils/uiResponseAdapter.js';

// Engines
import fundamentalAnalysisService from './fundamentalAnalysisService.js';
import analystConsensusEngine from './analystConsensusEngine.js';
import insiderIntentService from './insiderIntentService.js';
import gammaExposureService from './gammaExposureService.js';
import narrativePressureService from './narrativePressureService.js';
import macroLiquidityPulseEngine from './macroLiquidityPulseEngine.js';
import crossSignalConsensusEngine from './crossSignalConsensusEngine.js';
import tradeArchitectService from './tradeArchitectService.js';
import metaCortexService from './metaCortexService.js';
import evolutionEngine from './evolutionEngine.js';
import volatilitySurfaceEngine from './volatilitySurfaceEngine.js';
import institutionalFlowEngine from './institutionalFlowEngine.js';
import globalNewsAttentionEngine from './globalNewsAttentionEngine.js';
import unusualOptionsEngine from './unusualOptionsEngine.js';
import supplyChainStressEngine from './supplyChainStressEngine.js';
import hedgeFund13FEngine from './hedgeFund13FEngine.js';
import deepValuationEngine from './deepValuationEngine.js';
import seasonalityEngine from './seasonalityEngine.js';
import marketBreadthEngine from './marketBreadthEngine.js';
import volatilityRegimeEngine from './volatilityRegimeEngine.js';
import globalMacroForecastService from './globalMacroForecastService.js';
import shadowLiquidityService from './shadowLiquidityService.js';

// Helper: Returns fallback on failure AND injects fallback_used flag
async function safeRun<T>(name: string, promise: Promise<T>, fallback: T): Promise<T> {
    try {
        const result = await promise;
        if (!result) throw new Error('Result null');
        return result;
    } catch (e) {
        // console.error(`[UIF] ${name} Failed: ${e.message}`);
        const flaggedFallback = { ...fallback, fallback_used: true };
        return flaggedFallback as unknown as T;
    }
}

// Helper: Merges data and preserves fallback_used flag if present in source
function merge<T>(data: T, source: any): T {
    if (source && source.fallback_used) {
        return { ...data, fallback_used: true } as T;
    }
    return data;
}

class UnifiedIntelligenceFactory {

  public async generateBundle(ticker: string): Promise<IntelligenceBundle> {
    
    // 1. Critical: Price (Must Fail if Missing)
    const priceData = await priceService.getCurrentPrice(ticker);
    if (!priceData) throw new Error(`Price unavailable for ${ticker}`);

    // 2. Run Engines (STRICT: 0-Based / UNKNOWN Fallbacks)
    
    const fsi = await safeRun('FSI', fundamentalAnalysisService.performComprehensiveVetting(ticker), 
        { overallScore: 0, summary: 'Data unavailable', scores: [], overallStatus: 'MISSING' });
        
    const ace = await safeRun('ACE', analystConsensusEngine.analyze(ticker, priceData.price, {}), 
        { street_score: 0, consensus_rating: 'UNKNOWN', validation_status: 'UNSUPPORTED', upside_potential: 0, correlation_details: [], ticker, avg_price_target: 0 });
        
    const insider = await safeRun('Insider', insiderIntentService.analyzeIntent(ticker), 
        { ticker, confidence: 0, classification: 'UNKNOWN', details: 'No data', signal_strength: 0, insiders_involved: [] });
        
    const gamma = await safeRun('Gamma', gammaExposureService.analyze(ticker), 
        { ticker, net_gamma_exposure: 0, volatility_regime: 'NEUTRAL', current_price: priceData.price, reason: 'Data Unavailable', gamma_flip_level: 0, total_call_oi: 0, total_put_oi: 0, put_call_ratio: 0 });
        
    const narrative = await safeRun('Narrative', narrativePressureService.calculatePressure(ticker), 
        { ticker, pressure_score: 0, regime: 'NORMAL', dominant_narrative: 'None', sources_breakdown: {social_velocity:0,news_volume:0,political_heat:0,institutional_urgency:0} });
        
    const macro = await safeRun('Macro', macroLiquidityPulseEngine.analyze(), 
        { score: 0, regime: 'NEUTRAL', net_liquidity_trend: 'FLAT', components: {fed_balance_sheet:'NEUTRAL', rrp_flow:'NEUTRAL'}, details: [] });
        
    const volSurf = await safeRun('VolSurf', volatilitySurfaceEngine.analyze(ticker, priceData.price), 
        { iv_rank: 0, regime: 'NORMAL', skew: 0, breakout_prob: 0, details: [] });
        
    const instFlow = await safeRun('InstFlow', institutionalFlowEngine.analyzeFlows(ticker), 
        { ticker, conviction_score: 0, smart_money_bias: 'NEUTRAL', ownership_pct: 0, fund_count: 0, etf_support: false, details: [] });
        
    const gnae = await safeRun('GNAE', globalNewsAttentionEngine.analyze(), 
        { global_attention_score: 0, dom_region: 'Neutral', dom_sector: 'Neutral', regions: { us:0, eu:0, asia:0 }, sectors: {tech:0,energy:0,finance:0,healthcare:0}, dominant_region: 'Neutral', dominant_sector: 'Neutral' });
        
    const uoa = await safeRun('UOA', unusualOptionsEngine.analyze(ticker), 
        { ticker, score: 0, sentiment: 'NEUTRAL', metrics: { call_put_ratio: 0, net_premium_flow:0, iv_rank:0, gamma_squeeze_risk:'LOW' }, anomalies: [] });
        
    const scs = await safeRun('SCS', supplyChainStressEngine.analyze(), 
        { score: 0, regime: 'NEUTRAL', components: { pmi:0, logistics_performance:0, ppi_trend:'FLAT' }, details: [] });
        
    const hfai = await safeRun('HFAI', hedgeFund13FEngine.analyze(ticker), 
        { score: 0, sentiment: 'NEUTRAL', whale_activity: { buying_funds: [], selling_funds: [], net_change: 0 }, details: [] });
        
    const dve = await safeRun('DVE', deepValuationEngine.analyze(ticker), 
        { score: 0, valuation_band: 'FAIR', fair_value: 0, upside_percent: 0, metrics: { pe_ratio:0, peg_ratio:0, ev_ebitda:0, fcf_yield:0 }, details: [] });
        
    const seas = await safeRun('Seasonality', seasonalityEngine.analyze(ticker), 
        { score: 0, month_name: 'Unknown', avg_return_pct: 0, win_rate_pct: 0, trend: 'NEUTRAL', details: [] });
        
    const mbe = await safeRun('Breadth', marketBreadthEngine.analyze(), 
        { score: 0, regime: 'NEUTRAL', thrust_detected: false, metrics: {ad_ratio:0,sector_breadth:0,rsp_spy_divergence:0}, details: [] });
        
    const vre = await safeRun('VolRegime', volatilityRegimeEngine.analyze(ticker, []), 
        { regime: 'NORMAL', metrics: { vix: 0, atr_pct: 0, hv_30: 0 }, adaptations: { stop_loss_multiplier: 1, position_size_multiplier: 1, entry_aggressiveness: 'Neutral' } });

    const gmf = await safeRun('GMF', globalMacroForecastService.generateForecast(),
        { health_score: 0, inflation: { trend: 'UNKNOWN', cpi: 0, ppi: 0 }, growth: { trend: 'UNKNOWN', gdp: 0, unemployment: 0 }, liquidity: { trend: 'UNKNOWN', fed_rate: 0, yield_curve: 0 }, currency: { dxy: 0, impact: 'UNKNOWN' }, summary: 'Data Unavailable' });

    const shadow = await safeRun('Shadow', shadowLiquidityService.scanShadows(ticker), 
        { ticker, shadow_volume_ratio: 0, bias: 'UNKNOWN' as any, stealth_score: 0, reason: 'Data Unavailable', dark_prints: [] });
    
    // Meta
    const evolution = await safeRun('Evolution', evolutionEngine.getLatestPlan(), { generated_at: new Date().toISOString(), health_score: 100, upgrades: [], learning_biases: {} });
    
    // 3. Score
    // Collect all scores for Consensus. 0s will be ignored.
    const consensusInput = {
      fsi: fsi.overallScore,
      ace: ace.street_score,
      insider: insider.confidence,
      gamma: gamma.net_gamma_exposure, // Engine must return normalized 0-100 or this needs mapping
      narrative: narrative.pressure_score,
      macro: macro.score,
      volatility: volSurf.iv_rank,
      ife: instFlow.conviction_score,
      hfai: hfai.score,
      seasonality: seas.score
    };

    const scoringResult = await crossSignalConsensusEngine.calculateScore(ticker, consensusInput);
    
    // 4. Trade Plan
    const sector = fsi.summary?.includes('Technology') ? 'Technology' : 'General';
    let volProfile: 'High' | 'Medium' | 'Low' = 'Medium';
    if (volSurf.regime === 'HIGH_FEAR' || (vre.metrics.vix > 30)) volProfile = 'High';
    else if (volSurf.regime === 'COMPRESSED' || (vre.metrics.vix < 12 && vre.metrics.vix > 0)) volProfile = 'Low';

    const tradePlan = await tradeArchitectService.constructPlan(
      ticker, priceData.price, scoringResult.final_score, volProfile, scoringResult.confidence_tier as any, sector
    );

    // 5. Assemble
    const bundle: IntelligenceBundle = {
      ticker: ticker.toUpperCase(),
      sector: sector,
      price_data: { current: priceData.price, open: priceData.price, volatility_profile: volProfile },
      engines: {
        fsi: merge({ score: fsi.overallScore, traffic_light: fsi.overallStatus === 'APPROVED' ? 'GREEN' : fsi.overallStatus === 'REJECTED' ? 'RED' : 'YELLOW', details: fsi.summary, metrics: fsi.scores }, fsi),
        ace: merge({ street_score: ace.street_score, rating: ace.consensus_rating, status: ace.validation_status, upside: ace.upside_potential, details: ace.correlation_details }, ace),
        ife: merge({ conviction: instFlow.conviction_score, bias: instFlow.smart_money_bias, ownership: instFlow.ownership_pct, details: instFlow.details }, instFlow),
        gmf: merge({ score: gmf.health_score, inflation: gmf.inflation.trend, growth: gmf.growth.trend, liquidity: gmf.liquidity.trend }, gmf),
        carm: { score: 0, regime: 'UNKNOWN', drivers: [] },
        cae: { score: 0, events: {}, details: [] },
        scs: merge({ score: scs.score, regime: scs.regime, pmi: scs.components.pmi, details: scs.details }, scs),
        bbm: { score: 0, yield: 0, action: 'NEUTRAL', details: [] },
        mlp: merge({ score: macro.score, regime: macro.regime, trend: macro.net_liquidity_trend, details: macro.details }, macro),
        ofi: { score: 0, net_prem: 0, ratio: 0, burst: false, details: [] },
        hfai: merge({ score: hfai.score, sentiment: hfai.sentiment, whales: { buy: hfai.whale_activity.buying_funds, sell: hfai.whale_activity.selling_funds }, details: hfai.details }, hfai),
        iat: merge({ score: 0, alpha: 0, top_insider: null, validity: 'NEUTRAL', details: [] }, insider),
        seas: merge({ score: seas.score, month: seas.month_name, avg_return: seas.avg_return_pct, win_rate: seas.win_rate_pct, trend: seas.trend, details: seas.details }, seas),
        volsurf: merge({ skew: volSurf.skew, iv_rank: volSurf.iv_rank, breakout: (volSurf as any).breakout_prob || 0, regime: volSurf.regime, details: volSurf.details }, volSurf),
        iof: { pressure: 'NEUTRAL', net_flow: 0, blocks: 0, details: [] },
        gnae: merge({ 
            global_attention_score: gnae.global_attention_score, 
            dom_region: gnae.dom_region, 
            dom_sector: gnae.dom_sector, 
            regions: gnae.regions, 
            sectors: gnae.sectors,
            dominant_region: gnae.dominant_region,
            dominant_sector: gnae.dominant_sector
        }, gnae),
        hapde: { detected: false, pattern: '', signal: 'NEUTRAL', confidence: 0, details: [] },
        dve: merge({ score: dve.score, band: dve.valuation_band as any, fair_value: dve.fair_value, upside: dve.upside_percent, metrics: { pe: dve.metrics.pe_ratio, peg: dve.metrics.peg_ratio, fcf_yield: dve.metrics.fcf_yield }, details: dve.details }, dve),
        ipe: merge({ score: insider.signal_strength, classification: insider.classification as any, cluster: false, chain: false, details: [insider.details] }, insider),
        mbe: merge({ score: mbe.score, regime: mbe.regime, thrust: mbe.thrust_detected, details: mbe.details }, mbe),
        vre: merge({ regime: vre.regime as any, factors: { stop_mult: vre.adaptations.stop_loss_multiplier, size_mult: vre.adaptations.position_size_multiplier, aggressiveness: vre.adaptations.entry_aggressiveness }, vix: vre.metrics.vix }, vre),
        uoa: merge(uoa, uoa),
        correlation: { score: 0, regime: 'COUPLED', lead_lag: 'NEUTRAL', crypto_beta: 0, details: [] },
        gamma: merge({ regime: gamma.volatility_regime, exposure: gamma.net_gamma_exposure }, gamma),
        insider: merge({ classification: insider.classification, score: insider.confidence }, insider),
        narrative: merge({ score: narrative.pressure_score, regime: narrative.regime }, narrative),
        shadow: merge({ bias: shadow.bias, score: shadow.stealth_score }, shadow),
        regime: { current: macro.regime, favored: false },
        agents: { consensus: scoringResult.confidence_tier, breakdown: scoringResult.breakdown },
        catalyst: { detected: false, type: "NONE" },
        volatility: { regime: volSurf.regime, vix_level: vre.metrics.vix || 0 },
        divergence: { detected: false, type: 'NONE' }
      },
      learning: { evolution_bias: 1.0, drift_correction: 0, attribution_weights: {}, blind_spot_warning: false },
      scoring: {
        raw_confidence: scoringResult.final_score,
        weighted_confidence: scoringResult.final_score,
        final_conviction: scoringResult.confidence_tier as any,
        primary_driver: this.determinePrimaryDriver(scoringResult.breakdown),
        reasons: [`Consensus Score: ${scoringResult.final_score.toFixed(1)}`]
      },
      trade_plan: tradePlan,
      meta: { system_health: 100, warning: false, generated_at: new Date().toISOString() },
      generated_at: new Date().toISOString(),
      version: 'v113.0-T3-MCE-PURITY'
    };

    return bundle;
  }

  public async generateDailyTop3(): Promise<IntelligenceBundle[]> {
    const universe = await tickerUniverseService.getUniverse();
    const scanList = universe.slice(0, 10);
    const bundles = await Promise.all(scanList.map(t => this.generateBundle(t).catch(() => null)));
    const valid = bundles.filter((b): b is IntelligenceBundle => b !== null);
    valid.sort((a, b) => b.scoring.weighted_confidence - a.scoring.weighted_confidence);
    return valid.slice(0, 3);
  }

  public async generateTopPicks(): Promise<IntelligenceBundle[]> {
    return this.generateDailyTop3();
  }

  private determinePrimaryDriver(breakdown: any): string {
      let maxVal = -1;
      let driver = 'Unknown';
      for (const [key, val] of Object.entries(breakdown)) {
          if (typeof val === 'number' && val > maxVal) {
              maxVal = val;
              driver = key;
          }
      }
      return driver.toUpperCase();
  }
}

export default new UnifiedIntelligenceFactory();
