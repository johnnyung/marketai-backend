import 'dotenv/config';
import comprehensiveDataEngine from '../../services/comprehensiveDataEngine.js';
import userPortfolioService from '../../services/userPortfolioService.js';

async function test() {
  console.log("🧪 Testing Portfolio Analysis Logic...");

  // 1. Add a test holding if none
  await userPortfolioService.addHolding('AAPL', 10, 150, new Date().toISOString());

  // 2. Run Engine Directly
  console.log("   -> Invoking Engine...");
  const results = await comprehensiveDataEngine.analyzeSpecificTickers(['AAPL']);
  
  if (results.length > 0) {
      console.log("   ✅ Engine returned results:");
      console.log(JSON.stringify(results[0], null, 2));
  } else {
      console.error("   ❌ Engine returned EMPTY array (Check logs)");
      process.exit(1);
  }

  // 3. Run User Service Wrapper
  console.log("   -> Invoking Service Wrapper...");
  const outcome = await userPortfolioService.analyzePortfolio();
  console.log("   ✅ Service Outcome:", outcome);
  
  process.exit(0);
}

test();
