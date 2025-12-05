import 'dotenv/config';
import axios from 'axios';

const BASE_URL = 'http://localhost:3001';

async function test() {
    console.log("🧪 TESTING POT PHASE 5 API...");

    // 1. Test Active Tips (New Fields)
    try {
        const res = await axios.get(`${BASE_URL}/api/ai-tips/active`);
        if (res.data.success) {
            const tips = res.data.data;
            if (tips.length > 0) {
                const tip = tips[0];
                if (tip.confidence_reasons && tip.agent_reliability_scores) {
                    console.log("   ✅ /api/ai-tips/active: Schema Verified");
                    console.log(`      Reasoning: ${tip.confidence_reasons[0]}`);
                } else {
                    console.error("   ❌ Active Tips Schema Missing New Fields");
                }
            } else {
                console.log("   ⚠️  No active tips to verify (Engine Idle)");
            }
        }
    } catch (e: any) {
        console.error(`   ❌ Active Tips API Failed: ${e.message}`);
    }

    // 2. Test Engine Stats
    try {
        const res = await axios.get(`${BASE_URL}/api/confidence/engine-stats`);
        if (res.data.success && res.data.data.agent_performance) {
            console.log("   ✅ /api/confidence/engine-stats: Operational");
            console.log(`      Agents Tracked: ${res.data.data.agent_performance.length}`);
        } else {
            console.error("   ❌ Engine Stats Schema Invalid");
        }
    } catch (e: any) {
        console.error(`   ❌ Engine Stats API Failed: ${e.message}`);
    }
    
    process.exit(0);
}

test();
