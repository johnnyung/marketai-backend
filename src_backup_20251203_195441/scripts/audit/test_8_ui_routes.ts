import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust path to reach sibling 'marketai' folder from 'marketai-backend/src/scripts/audit'
const UI_DIR = path.resolve(__dirname, '../../../../marketai/src');

const REQUIRED_ROUTES = [
    'dashboard', 'my-portfolio', 'ai-tip-tracker', 'correlation-lab',
    'digest', 'social-sentiment', 'technical', 'deep-dive',
    'data-monitor', 'diagnostics', 'opportunities', 'regime',
    'multi-agent', 'narrative', 'catalyst'
];

async function run() {
    console.log("🖥️  TEST 8: UI ROUTE VALIDATION...");
    
    if (!fs.existsSync(UI_DIR)) {
        console.log(`   ⚠️  Frontend dir not found at ${UI_DIR}. Skipping (Environment issue).`);
        process.exit(0);
    }

    const appFile = path.join(UI_DIR, 'App.tsx');
    if (!fs.existsSync(appFile)) {
         console.log("   ❌ App.tsx missing.");
         process.exit(1);
    }

    const content = fs.readFileSync(appFile, 'utf-8');
    let missing = 0;

    REQUIRED_ROUTES.forEach(route => {
        // Check for path="route" OR path="/route" to be safe
        const regex = new RegExp(`path=["']/?${route}["']`);
        
        if (!regex.test(content)) {
            console.log(`   ❌ Missing Route: ${route}`);
            missing++;
        } else {
            console.log(`   ✅ Found Route: ${route}`);
        }
    });

    if (missing > 0) {
        console.log(`   🚨 ${missing} Routes Missing in App.tsx`);
        process.exit(1);
    } else {
        console.log("   ✅ All Frontend Routes Wired Successfully.");
        process.exit(0);
    }
}
run();
