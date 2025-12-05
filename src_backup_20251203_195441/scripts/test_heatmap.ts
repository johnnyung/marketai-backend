import 'dotenv/config';
import smartMoneyHeatmapService from '../services/smartMoneyHeatmapService.js';

async function test() {
    console.log("🧪 TESTING SMART MONEY HEATMAP...");

    const dash = await smartMoneyHeatmapService.getDashboard();
    
    console.log(`   📊 Heatmap Sectors: ${dash.heatmap.length}`);
    console.log(`   🔥 Accumulation Targets: ${dash.top_accumulation.length}`);
    console.log(`   ❄️  Distribution Targets: ${dash.top_distribution.length}`);

    if (dash.heatmap.length > 0) {
        const topSector = dash.heatmap[0];
        console.log(`      -> Top Sector: ${topSector.name} (Flow: ${topSector.net_flow_score})`);
        console.log("   ✅ Heatmap Generated Successfully.");
        process.exit(0);
    } else {
        console.error("   ❌ Heatmap Empty.");
        process.exit(1);
    }
}

test();
