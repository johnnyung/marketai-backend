import insiderPatternEngine from '../services/insiderPatternEngine.js';

async function run() {
  const ticker = process.argv[2] || 'AAPL';
  console.log(`\n[TEST_IPE] Running Insider Pattern Engine for ${ticker}...\n`);

  const result = await insiderPatternEngine.analyze(ticker);

  console.log(JSON.stringify(result, null, 2));
}

run().catch(err => {
  console.error('[TEST_IPE] Error:', err);
  process.exit(1);
});
