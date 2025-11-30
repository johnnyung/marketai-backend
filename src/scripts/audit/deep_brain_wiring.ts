import 'dotenv/config';
import crossSignalConsensusEngine from '../../services/crossSignalConsensusEngine.js';
import tribunalService from '../../services/tribunalService.js';

async function testDeepBrain() {
  console.log("   🧠 Testing Deep Brain Wiring...");

  try {
    // Mock Input Data for Consensus
    const ticker = 'AAPL';
    const mockInputs = {
      macro_score: 75,
      technical_score: 80,
      sentiment_score: 60,
      insider_score: 50,
      valuation_score: 70,
      regime: { current_regime: 'GOLDILOCKS' },
      sentiment: { metrics: { vix: 15 } }
    };

    // 1. Test Consensus Engine
    // Signature: calculateScore(ticker: string, inputs: any)
    console.log("      -> Testing Consensus Engine...");
    const score = await crossSignalConsensusEngine.calculateScore(ticker, mockInputs);
    
    if (!score || typeof score.final_score !== 'number') {
        throw new Error("Consensus Engine returned invalid data");
    }
    console.log(`         Result: ${score.final_score}/100`);

    // 2. Test Tribunal
    // Signature: conductTrial(ticker: string)
    console.log("      -> Testing Tribunal...");
    const verdict = await tribunalService.conductTrial(ticker);
    
    if (!verdict || !verdict.final_verdict) {
        throw new Error("Tribunal returned invalid data");
    }
    console.log(`         Verdict: ${verdict.final_verdict}`);

    console.log("   ✅ Deep Brain Logic Verified.");
    process.exit(0);

  } catch (error: any) {
    console.error("   ❌ Deep Brain Test Failed:", error.message);
    process.exit(1);
  }
}

testDeepBrain();
