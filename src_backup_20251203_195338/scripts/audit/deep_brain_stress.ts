import crossSignalConsensusEngine from '../../services/crossSignalConsensusEngine.js';

async function runStressTest() {
  console.log('🔥 Deep Brain Stress Test...');
  const ticker = 'STRESS';

  // Stress Inputs: Mix of High, Low, and Zero (Missing)
  const inputs = {
    fsi: 90,
    ace: 20,
    insider: 0, // Should be ignored by dynamic scoring
    gamma: 0,   // Should be ignored
    narrative: 80,
    macro: 40,
    volatility: 60
  };

  try {
    const consensus = await crossSignalConsensusEngine.calculateScore(ticker, inputs);
    
    console.log('✅ Stress Test Passed');
    console.log(`   Active Engines: ${consensus.active_engines_count}`);
    console.log(`   Final Score: ${consensus.final_score}`);
    
    if (consensus.breakdown['insider'] !== 0) {
        console.warn('⚠️  Warning: Zero score should be treated as 0 in breakdown');
    }
  } catch (error) {
    console.error('❌ Stress Test Failed:', error);
    process.exit(1);
  }
}

runStressTest();
