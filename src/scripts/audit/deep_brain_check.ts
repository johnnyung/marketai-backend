import 'dotenv/config';
import crossSignalConsensusEngine from '../../services/crossSignalConsensusEngine.js';
import tribunalService from '../../services/tribunalService.js';
import multiAgentValidationService from '../../services/multiAgentValidationService.js';

async function run() {
  try {
    console.log("🧠 Testing Deep Brain Wiring...");
    const ticker = 'AAPL';
    const mockInputs = { regime: { current_regime: 'GOLDILOCKS' } };
    
    await crossSignalConsensusEngine.calculateScore(ticker, mockInputs);
    await tribunalService.conductTrial(ticker);
    await multiAgentValidationService.validate(ticker);
    
    console.log("✅ Deep Brain Operational");
    process.exit(0);
  } catch (e: any) {
    console.error("❌ Deep Brain Failed:", e.message);
    process.exit(1);
  }
}
run();
