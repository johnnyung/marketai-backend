import 'dotenv/config';
import metaCortexService from '../services/metaCortexService.js';

async function test() {
    console.log("🧪 TESTING META-ANALYST (CLAUDE INTEGRATION)...");

    // 1. Run Diagnostics (Triggers LLM)
    const report = await metaCortexService.runDiagnostics();

    console.log(`   🏥 Health Score: ${report.health_score}%`);
    
    if (report.ai_analyst_report) {
        console.log(`   🧠 Chief Scientist Report: "${report.ai_analyst_report}"`);
        console.log(`   🛠️  Proposed Upgrades:`);
        report.recommended_upgrades.forEach(u => console.log(`      - ${u}`));
        
        console.log("   ✅ AI Meta-Analysis Successful.");
        process.exit(0);
    } else {
        console.error("   ❌ AI Analysis Failed (No Report Returned). Check API Key.");
        process.exit(1);
    }
}

test();
