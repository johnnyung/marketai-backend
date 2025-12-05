import 'dotenv/config';
import comprehensiveDataEngine from '../services/comprehensiveDataEngine.js';

async function test() {
    console.log("🧪 TESTING SELF-EVOLUTION PIPELINE...");

    try {
        // Run a mini scan
        const result = await comprehensiveDataEngine.analyzeSpecificTickers(['AAPL']);
        
        if (result.length > 0) {
            const r = result[0];
            const meta = r.decision_matrix.meta_cortex;
            
            if (meta && meta.health !== undefined) {
                console.log(`   ✅ Meta-Cortex Data Injected (Health: ${meta.health}%)`);
                console.log(`   ✅ System Modifier: x${meta.system_modifier}`);
                
                if (meta.upgrades) {
                    console.log(`   🧬 Evolution Plan Attached: ${meta.upgrades.length} upgrades found.`);
                }
                process.exit(0);
            } else {
                console.error("   ❌ Meta-Cortex Data Missing from Analysis.");
                process.exit(1);
            }
        } else {
            console.error("   ❌ Engine returned no results.");
            process.exit(1);
        }

    } catch (e: any) {
        console.error("   ❌ Test Failed:", e.message);
        process.exit(1);
    }
}

test();
