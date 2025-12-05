import 'dotenv/config';
import tradeArchitectService from '../services/tradeArchitectService.js';
import financialHealthService from '../services/financialHealthService.js';

async function run() {
    console.log("🧪 Running v113 Full Coverage Test...");
    
    try {
        // 1. FSI Test
        const fsi = await financialHealthService.analyze('AAPL');
        if (!fsi.traffic_light) throw new Error("FSI failed");
        console.log("   ✅ FSI Service: OK");

        // 2. Trade Architect Test
        const mockEngines = {
            gamma: { volatility_regime: 'NEUTRAL' },
            shadow: { bias: 'NEUTRAL' },
            narrative: { pressure_score: 50 }
        };
        
        // FIXED: Added await
        const plan = await tradeArchitectService.constructPlan(
            'AAPL', 150, 80, 'Medium', 'blue_chip', mockEngines
        );

        if (plan.entry_primary && plan.stop_loss && plan.allocation_percent) {
            console.log("   ✅ Trade Architect: OK");
        } else {
            throw new Error("Trade Architect returned incomplete plan");
        }
        
        process.exit(0);

    } catch (e: any) {
        console.error("   ❌ Test Failed:", e.message);
        process.exit(1);
    }
}

run();
