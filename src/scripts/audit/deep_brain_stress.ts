import { Pool } from 'pg';
import dotenv from 'dotenv';

// --- ENGINE IMPORTS ---
import crossSignalConsensusEngine from '../../services/crossSignalConsensusEngine.js';
import multiAgentValidationService from '../../services/multiAgentValidationService.js';
import divergenceDetectorService from '../../services/divergenceDetectorService.js';
import tribunalService from '../../services/tribunalService.js';
import narrativePressureService from '../../services/narrativePressureService.js';
import insiderIntentService from '../../services/insiderIntentService.js';
import gammaExposureService from '../../services/gammaExposureService.js';
import currencyShockService from '../../services/currencyShockService.js';
import priceStabilityService from '../../services/priceStabilityService.js';
import regimeTransitionService from '../../services/regimeTransitionService.js';
import shadowLiquidityService from '../../services/shadowLiquidityService.js';
import liquidityTrapService from '../../services/liquidityTrapService.js';

dotenv.config();

const TARGETS = ['AAPL', 'NVDA', 'TSLA', 'GOOGL', 'META', 'AMD'];

async function runAudit() {
  console.log("   🧠 Loading Deep Brain Context (Global Macro)...");
  
  // 1. FETCH GLOBAL CONTEXT (Run once)
  const [fx, regime] = await Promise.all([
      currencyShockService.analyzeShock(),
      regimeTransitionService.detectRegime()
  ]);

  console.log(`      -> Regime: ${regime.current_regime} | FX Shock: ${fx.shock_level}`);
  console.log("   🧠 Running Ticker-Level Synaptic Scans...");

  const report: any = {};

  for (const ticker of TARGETS) {
      // console.log(`      -> Scanning ${ticker}...`);
      const start = Date.now();

      // 2. RUN ALL ENGINES IN PARALLEL
      const [
          agents,
          fractal,
          tribunal,
          narrative,
          insider,
          gamma,
          stability,
          shadow,
          trap
      ] = await Promise.all([
          multiAgentValidationService.validate(ticker),
          divergenceDetectorService.analyzeFractals(ticker),
          tribunalService.conductTrial(ticker),
          narrativePressureService.calculatePressure(ticker),
          insiderIntentService.analyzeIntent(ticker),
          gammaExposureService.analyze(ticker),
          priceStabilityService.analyzeStability(ticker),
          shadowLiquidityService.scanShadows(ticker),
          liquidityTrapService.screen(ticker, 'blue_chip')
      ]);

      // 3. CALCULATE CONSENSUS SCORE
      // Construct inputs object expected by Consensus Engine
      const consensusInputs = {
          macro_score: regime.current_regime === 'GOLDILOCKS' ? 80 : 50, // Simplified logic
          technical_score: 50, // Placeholder, covered by agents
          sentiment_score: narrative.pressure_score,
          insider_score: insider.signal_strength,
          valuation_score: 50,
          regime,
          sentiment: { score: narrative.pressure_score, metrics: { vix: 20 } }, // Mock sentiment obj
          insider
      };

      const consensus = await crossSignalConsensusEngine.calculateScore(ticker, consensusInputs);

      // 4. BUILD REPORT NODE
      report[ticker] = {
          latency_ms: Date.now() - start,
          consensus: {
              score: consensus.final_score,
              tier: consensus.confidence_tier,
              regime_adj: consensus.regime_adjustment
          },
          engines: {
              multi_agent: agents.consensus,
              fractal: fractal.has_divergence ? fractal.divergence_type : 'NONE',
              tribunal: tribunal.final_verdict,
              narrative: { score: narrative.pressure_score, regime: narrative.regime },
              insider: insider.classification,
              gamma: gamma ? gamma.volatility_regime : 'NO_DATA',
              stability: stability.recommendation,
              shadow: shadow.bias,
              macro_filter: fx.shock_level === 'LOW' ? 'PASS' : 'CAUTION',
              regime_filter: regime.current_regime
          },
          active_signals: [
              agents.consensus.includes('BUY') ? 'AGENTS_BUY' : null,
              fractal.has_divergence ? `FRACTAL_${fractal.divergence_type}` : null,
              tribunal.final_verdict === 'BUY' ? 'TRIBUNAL_BUY' : null,
              insider.classification === 'OPPORTUNISTIC' ? 'INSIDER_BUY' : null,
              gamma?.volatility_regime === 'SUPPRESSED' ? 'GAMMA_STABILITY' : null
          ].filter(Boolean)
      };
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

runAudit();
