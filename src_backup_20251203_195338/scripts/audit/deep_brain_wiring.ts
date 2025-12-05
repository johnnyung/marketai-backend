import crossSignalConsensusEngine from '../../services/crossSignalConsensusEngine.js';

async function runWiringCheck() {
  console.log('🔌 Deep Brain Wiring Verification...');
  const ticker = 'WIRE_TEST';

  const mockInputs = {
    fsi: 75,
    ace: 65,
    insider: 55,
    gamma: 45
  };

  try {
    const result = await crossSignalConsensusEngine.calculateScore(ticker, mockInputs);
    
    if (result.final_score > 0 && result.confidence_tier) {
        console.log('✅ Wiring Confirmed: Logic is flowing.');
    } else {
        console.error('❌ Wiring Error: Invalid result structure');
    }
  } catch (error) {
    console.error('❌ Wiring Failed:', error);
    process.exit(1);
  }
}

runWiringCheck();
