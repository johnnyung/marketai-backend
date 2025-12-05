import { outcomeTracker } from './outcomeTracker.js';
import { winLossAttribution } from './winLossAttribution.js';
import { confidenceCalibration } from './confidenceCalibration.js';
import { blindSpotDetector } from './blindSpotDetector.js';
import { driftDetector } from './driftDetector.js';
import { dataCoverageMap } from './dataCoverageMap.js';
import { signalWeightOptimizer } from './signalWeightOptimizer.js';
import { historicalReplaySimulator } from './historicalReplaySimulator.js';
import { errorClassificationEngine } from './errorClassificationEngine.js';
import { memorySnapshotLogger } from './memorySnapshotLogger.js';
import { metaRiskMonitor } from './metaRiskMonitor.js';

class EvolutionLoopController {
  async runDailyCycle() {
    console.log("🧬 Evolution Loop: Starting 12-Phase Learning Cycle...");
    
    // 1. Get Data
    const trades = await outcomeTracker.getRecentOutcomes(30);
    
    // 2. Attribute
    const attribution = await winLossAttribution.analyze(trades);
    
    // 3. Calibrate Confidence (Mocking avg conf for now)
    const calibration = confidenceCalibration.calibrate(75, 0.6); 
    
    // 4. Blind Spots
    const blindSpots = await blindSpotDetector.scan();
    
    // 5. Optimize Weights (The Core)
    const currentWeights = await signalWeightOptimizer.getCurrentWeights();
    const newWeights = await signalWeightOptimizer.optimize(attribution);
    
    // 6. Detect Drift
    const drift = driftDetector.detect(currentWeights, newWeights);
    
    // 7. Coverage
    const coverage = await dataCoverageMap.mapCoverage();
    
    // 8, 9, 11 (Auxiliary)
    historicalReplaySimulator.simulate();
    const errors = errorClassificationEngine.classify(trades.filter(t => t.result_outcome === 'LOSS'));
    const risk = metaRiskMonitor.assess(newWeights);
    
    // 10. Snapshot
    await memorySnapshotLogger.logSnapshot({ weights: newWeights, drift, risk });

    console.log("✅ Evolution Loop Complete.");
    return { newWeights, drift, risk, coverage };
  }

  async getActiveBiases() {
      return await signalWeightOptimizer.getCurrentWeights();
  }
}

export default new EvolutionLoopController();
