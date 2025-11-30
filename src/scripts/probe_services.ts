import dotenv from 'dotenv';
dotenv.config();

// IMPORT THE "IDLE" SERVICES
import momentumService from '../services/momentumService.js';
import ivNavigatorService from '../services/ivNavigatorService.js';
import smartMoneyService from '../services/smartMoneyService.js';
import corporateQualityService from '../services/corporateQualityService.js';
import revisionVelocityService from '../services/revisionVelocityService.js';
import crisisAmplifierService from '../services/crisisAmplifierService.js';
import shortTrapService from '../services/shortTrapService.js';
import confidenceLedgerService from '../services/confidenceLedgerService.js';

// TARGET TICKER (High Volatility for best chance of signals)
const TICKER = 'TSLA';

async function probe() {
  console.log(`\n🔬 PROBING LOGIC ENGINES FOR: ${TICKER}\n`);

  try {
    // 1. MOMENTUM
    console.log("1. Testing Momentum Service...");
    const mom = await momentumService.analyzeMomentum(TICKER);
    console.log(`   -> Result: ${mom.alignment} (Score: ${mom.score})`);
    console.log(`      Reason: ${mom.reason.substring(0, 60)}...`);

    // 2. IV NAVIGATOR
    console.log("\n2. Testing IV Navigator...");
    const iv = await ivNavigatorService.analyzeIV(TICKER);
    console.log(`   -> Regime: ${iv.regime} (Rank: ${iv.iv_rank})`);
    
    // 3. CORPORATE QUALITY
    console.log("\n3. Testing Corporate Quality...");
    const health = await corporateQualityService.analyzeHealth(TICKER);
    console.log(`   -> Rating: ${health.rating} (Passed: ${health.passed})`);
    if (health.flags.length > 0) console.log(`      Flags: ${health.flags.join(', ')}`);

    // 4. SMART MONEY
    console.log("\n4. Testing Smart Money...");
    const footprints = await smartMoneyService.scanFootprints();
    const tslaPrint = footprints.find(f => f.ticker === TICKER);
    console.log(`   -> Total Signals Found: ${footprints.length}`);
    if (tslaPrint) console.log(`      TSLA Signal: ${tslaPrint.type}`);
    else console.log(`      (No specific whale print for ${TICKER} right now)`);

    // 5. REVISION VELOCITY
    console.log("\n5. Testing Revision Velocity...");
    const rev = await revisionVelocityService.analyzeVelocity(TICKER);
    console.log(`   -> Momentum: ${rev.upgrade_momentum}`);

    // 6. CRISIS AMPLIFIER
    console.log("\n6. Testing Crisis Amplifier...");
    const crisis = await crisisAmplifierService.evaluateSignal(TICKER, 'BUY', 'Consumer Cyclical');
    console.log(`   -> Is Crisis? ${crisis.is_crisis}`);

    // 7. SHORT TRAP
    console.log("\n7. Testing Short Trap...");
    const trap = await shortTrapService.analyze(TICKER, 80); // Assume high sentiment
    console.log(`   -> Risk Level: ${trap.risk_level} (Short Float: ${trap.short_float}%)`);

    // 8. CONFIDENCE LEDGER
    console.log("\n8. Testing Confidence Ledger...");
    const ledger = await confidenceLedgerService.adjustConfidence(TICKER, 'Consumer Cyclical', 85);
    console.log(`   -> Adjusted: ${ledger.adjusted} (Reason: ${ledger.reason || 'None'})`);

    console.log("\n✅ PROBE COMPLETE. Logic layers are responsive.");

  } catch (e: any) {
    console.error("\n❌ PROBE FAILED:", e.message);
    console.error(e.stack);
  }
}

probe();
