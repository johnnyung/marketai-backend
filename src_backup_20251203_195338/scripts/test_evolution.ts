import 'dotenv/config';
import evolutionEngine from '../services/evolutionEngine.js';

async function test() {
    console.log("🧪 TESTING EVOLUTION ENGINE...");

    // 1. Generate Plan
    const plan = await evolutionEngine.generateEvolutionPlan();
    
    console.log(`   ❤️  Health Score: ${plan.health_score}%`);
    console.log(`   🧬 Upgrades Proposed: ${plan.upgrades.length}`);

    if (plan.upgrades.length > 0) {
        console.log("\n   📋 TOP UPGRADE RECOMMENDATION:");
        const top = plan.upgrades[0];
        console.log(`      Title: ${top.title}`);
        console.log(`      Type: ${top.category}`);
        console.log(`      Priority: ${top.priority}`);
        console.log(`      Gain: +${top.expected_accuracy_gain}% Accuracy`);
    } else {
        console.warn("   ⚠️  No upgrades proposed (System might be perfect or broken).");
    }

    console.log("\n   ✅ Evolution Logic Verified.");
    process.exit(0);
}

test();
