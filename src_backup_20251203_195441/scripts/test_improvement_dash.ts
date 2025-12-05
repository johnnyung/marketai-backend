import 'dotenv/config';
import selfImprovementService from '../services/selfImprovementService.js';

async function test() {
    console.log("🧪 TESTING SELF-IMPROVEMENT DASHBOARD...");

    try {
        const dash = await selfImprovementService.getDashboard();
        
        console.log("   📊 Dashboard Generated Successfully.");
        console.log(`      Health Score: ${dash.system_health.health_score}`);
        console.log(`      Drift Status: ${dash.learning_status.confidence_drift.status}`);
        console.log(`      Roadmap Items: ${dash.evolution_roadmap.length}`);
        console.log(`      Active Alerts: ${dash.active_alerts.length}`);
        
        console.log("\n   💡 STRATEGIC RECOMMENDATIONS:");
        dash.strategic_summary.forEach(s => console.log(`      - ${s}`));

        if (dash.missed_opportunities.length > 0) {
            console.log("\n   📉 MISSED OPPORTUNITIES (Timid Wins):");
            dash.missed_opportunities.forEach((m: any) =>
                console.log(`      - ${m.ticker}: +${m.performance_pnl}% (Conf: ${m.confidence_at_prediction})`)
            );
        }

        process.exit(0);

    } catch (e: any) {
        console.error("   ❌ Test Failed:", e.message);
        process.exit(1);
    }
}

test();
