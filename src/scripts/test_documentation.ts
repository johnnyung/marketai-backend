import 'dotenv/config';
import evolutionEngine from '../services/evolutionEngine.js';
import fs from 'fs';
import path from 'path';

async function test() {
    console.log("🧪 TESTING SELF-UPDATING DOCUMENTATION...");

    // 1. Trigger Evolution Engine
    await evolutionEngine.generateEvolutionPlan();

    // 2. Verify File Creation
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const fileName = `upgrade_${dateStr}.json`;
    const filePath = path.join(process.cwd(), 'docs', 'recommended_upgrades', fileName);

    if (fs.existsSync(filePath)) {
        console.log(`   ✅ Blueprint Found: ${filePath}`);
        
        const content = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);
        
        if (Array.isArray(json) && json.length > 0) {
            console.log(`   📝 Documented ${json.length} upgrades.`);
            console.log(`   🔍 Sample: ${json[0].recommended_solution}`);
            process.exit(0);
        } else {
            console.error("   ⚠️  File exists but is empty or invalid JSON.");
            process.exit(1);
        }
    } else {
        console.error(`   ❌ Documentation file NOT found: ${filePath}`);
        process.exit(1);
    }
}

test();
