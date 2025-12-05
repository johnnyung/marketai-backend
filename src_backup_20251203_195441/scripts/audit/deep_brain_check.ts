import crossSignalConsensusEngine from '../../services/crossSignalConsensusEngine.js';

async function runCheck() {
  console.log('🧪 Deep Brain Wiring Check...');
  const ticker = 'TEST';
  
  // New Signature: Record<string, number>
  const mockInputs = {
    fsi: 80,
    ace: 60,
    insider: 50,
    gamma: 50,
    narrative: 70
  };

  try {
    const score = await crossSignalConsensusEngine.calculateScore(ticker, mockInputs);
    console.log('✅ Consensus Engine is ONLINE');
    console.log(`   Final Score: ${score.final_score}`);
    console.log(`   Tier: ${score.confidence_tier}`);
  } catch (error) {
    console.error('❌ Consensus Engine Failed:', error);
    process.exit(1);
  }
}

runCheck();
