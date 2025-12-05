import analystConsensusEngine from '../services/analystConsensusEngine.js';

async function testACE() {
    console.log('Testing Analyst Consensus Engine...');
    const result = await analystConsensusEngine.analyze('AAPL', 150, {});
    console.log(JSON.stringify(result, null, 2));
}

testACE();
