import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_ROOT = path.resolve(__dirname, '../../../src');

const RESTRICTIONS = [
    { id: 'HARD_LIMIT_SLICE', regex: /\.slice\(0,\s*(?:[1-9]|[1-4]\d)\)/g, desc: 'Hardcoded Slice < 50' },
    { id: 'HARD_LIMIT_SQL', regex: /LIMIT\s+(?:[1-9]|[1-4]\d)\b/gi, desc: 'SQL LIMIT < 50' },
    { id: 'STATIC_TICKER_LIST', regex: /const\s+\w+\s*=\s*\[\s*'AAPL',\s*'MSFT'/g, desc: 'Hardcoded Mega-Cap Array' },
];

const CRITICAL_PATHS = [
    'services/comprehensiveDataEngine.ts',
    'services/collectors/apiDataCollector.ts'
];

async function audit() {
    console.log("🕵️  Scanning for Restrictions...");
    let violations = 0;
    
    for (const filePath of CRITICAL_PATHS) {
        const fullPath = path.join(SRC_ROOT, filePath);
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            RESTRICTIONS.forEach(rule => {
                if (rule.regex.test(content)) {
                    console.log(`   ❌ ${filePath}: ${rule.desc}`);
                    violations++;
                }
            });
        }
    }
    
    if (violations > 0) {
        console.log(`🚨 ${violations} RESTRICTIONS FOUND. PATCHING NOW...`);
        process.exit(1);
    } else {
        console.log("✅ SYSTEM CLEAN. NO RESTRICTIONS.");
        process.exit(0);
    }
}

audit();
