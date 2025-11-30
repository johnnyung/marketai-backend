import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_ROOT = path.resolve(__dirname, '../../../src');

// 1. STRICT RESTRICTION RULES
const RULES = [
    {
        id: 'STATIC_ARRAY',
        regex: /const\s+[A-Z_]+\s*=\s*\[\s*['"]AAPL['"],\s*['"]MSFT['"]/g, 
        desc: 'Hardcoded Ticker Array detected. Backend must use Discovery Engine.' 
    },
    { 
        id: 'TIGHT_LIMIT', 
        regex: /\.slice\(0,\s*[1-9]\)/g, 
        desc: 'Tight Array Slice (<10) detected. Research universe restricted.' 
    },
    { 
        id: 'SQL_LIMIT', 
        regex: /LIMIT\s+[1-9]\s*$/gim, 
        desc: 'SQL Limit < 10 detected in query.' 
    },
    { 
        id: 'HARD_FILTER', 
        regex: /if\s*\(.*(marketCap|volume)\s*<\s*1000000000/g, 
        desc: 'Large-Cap Bias detected (Market Cap Filter).' 
    },
    { 
        id: 'MISSING_DISCOVERY', 
        fileCheck: 'comprehensiveDataEngine.ts',
        mustContain: 'sectorDiscoveryService.getExpandedUniverse',
        desc: 'Engine does not call Wide-Net Discovery Service.'
    }
];

const FILES_TO_SCAN = [
    'services/comprehensiveDataEngine.ts',
    'services/sectorDiscoveryService.ts',
    'services/masterIngestionService.ts',
    'services/collectors/apiDataCollector.ts',
    'services/tradingOpportunitiesService.ts'
];

async function audit() {
    console.log("   🕵️  Deep Scan: Searching for Logic Constraints...");
    let violations = 0;

    for (const file of FILES_TO_SCAN) {
        const filePath = path.join(SRC_ROOT, file);
        if (!fs.existsSync(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Check Regex Rules
        RULES.forEach(rule => {
            if (rule.regex && rule.regex.test(content)) {
                console.log(`   ❌ [${file}] Violation: ${rule.desc}`);
                violations++;
            }
        });

        // Check Content Requirements
        RULES.forEach(rule => {
            if (rule.fileCheck === path.basename(file)) {
                if (rule.mustContain && !content.includes(rule.mustContain)) {
                    console.log(`   ❌ [${file}] Violation: ${rule.desc}`);
                    violations++;
                }
            }
        });
    }

    if (violations > 0) {
        console.log(`\n   🚨 BACKEND RESTRICTION DETECTED — ${violations} ISSUES FOUND.`);
        console.log("   Research Universe is Compromised. Applying Fixes...");
        process.exit(1); // Trigger patch
    } else {
        console.log("\n   ✅ BACKEND VERIFIED: UNRESTRICTED WIDE-NET ACTIVE.");
        process.exit(0);
    }
}

audit();
