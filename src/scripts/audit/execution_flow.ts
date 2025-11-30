import 'dotenv/config';
import riskConstraintService from '../../services/riskConstraintService.js';
import tradeManagementService from '../../services/tradeManagementService.js';

// GLOBAL WATCHDOG: Kill process after 15s
setTimeout(() => {
    console.error("🚨 GLOBAL WATCHDOG: Audit exceeded 15 seconds. Terminating.");
    process.exit(1);
}, 15000);

async function testExecution() {
  console.log("⚙️ Testing Execution Flow...");

  try {
    const ticker = 'AAPL';

    // 1. Test Risk Constraint
    console.log("      -> Testing Risk Constraint...");
    const fit = await riskConstraintService.checkFit(ticker);
    console.log(`         Fit: ${fit.passed ? 'PASS' : 'FAIL'} (${fit.reason})`);

    // 2. Test Trade Management (Magistrate)
    console.log("      -> Testing Magistrate (Review Positions)...");
    
    // Magistrate uses internal DB calls, so we just invoke and ensure no crash
    await tradeManagementService.reviewPositions();
    
    console.log("         Magistrate run complete.");
    console.log("   ✅ Execution Flow Verified.");
    process.exit(0);

  } catch (error: any) {
    console.error("   ❌ Execution Test Failed:", error.message);
    process.exit(1);
  }
}

testExecution();
