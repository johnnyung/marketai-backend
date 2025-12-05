import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fmpService from '../services/fmpService.js';
import unifiedIntelligenceFactory from '../services/unifiedIntelligenceFactory.js';
import portfolioIntelligenceEngine from '../services/portfolioIntelligenceEngine.js';
import tickerUniverseService from '../services/tickerUniverseService.js';

// Setup Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const REPORT_PATH = path.resolve(ROOT_DIR, 'docs/system/integrity_report.json');

// -----------------------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------------------

const TOXIC_PATTERNS = [
    { id: 'RANDOM', regex: /Math\.random\(\)/g, desc: 'Non-deterministic logic detected' },
    { id: 'MOCK_KEYWORD', regex: /const mock|let mock|var mock/i, desc: 'Explicit mock variable detected' },
    { id: 'HARDCODED_TICKERS', regex: /\['AAPL', 'NVDA', 'TSLA'\]|\['AAPL', 'MSFT', 'GOOGL'\]/, desc: 'Hardcoded ticker array detected' },
    { id: 'PLACEHOLDER_PRICE', regex: /price:\s*150|close:\s*150/, desc: 'Hardcoded placeholder price detected' },
    { id: 'EMPTY_STUB', regex: /\{\s*return \[\];\s*\}/, desc: 'Empty array stub function detected' }
];

const EXCLUDE_DIRS = ['node_modules', 'dist', 'build', '.git', 'docs', 'tests', 'scripts'];
const EXCLUDE_FILES = ['system_integrity_scan.ts', 'purge_mock_data.ts', 'seed_'];

// -----------------------------------------------------------------------------
// STATIC ANALYSIS ENGINE
// -----------------------------------------------------------------------------

interface FileIssue {
    file: string;
    line: number;
    issue: string;
    snippet: string;
}

async function runStaticAnalysis(dir: string): Promise<FileIssue[]> {
    let issues: FileIssue[] = [];
    
    try {
        const list = fs.readdirSync(dir);

        for (const file of list) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                if (!EXCLUDE_DIRS.includes(file)) {
                    issues = issues.concat(await runStaticAnalysis(fullPath));
                }
            } else if (file.endsWith('.ts')) {
                if (EXCLUDE_FILES.some(ex => file.includes(ex))) continue;

                const content = fs.readFileSync(fullPath, 'utf-8');
                const lines = content.split('\n');

                lines.forEach((line, index) => {
                    TOXIC_PATTERNS.forEach(pattern => {
                        if (pattern.regex.test(line)) {
                            issues.push({
                                file: path.relative(ROOT_DIR, fullPath),
                                line: index + 1,
                                issue: pattern.desc,
                                snippet: line.trim().substring(0, 50)
                            });
                        }
                    });
                });
            }
        }
    } catch (e) {
        console.warn(`Warning: Could not scan directory ${dir}`);
    }
    return issues;
}

// -----------------------------------------------------------------------------
// RUNTIME ANALYSIS ENGINE
// -----------------------------------------------------------------------------

interface RuntimeResult {
    check: string;
    status: 'PASS' | 'FAIL' | 'WARN';
    details: string;
}

async function runRuntimeAnalysis(): Promise<RuntimeResult[]> {
    const results: RuntimeResult[] = [];

    console.log('⚡ Running Runtime Diagnostics...');

    // 1. Check FMP Connection
    try {
        const fmpStatus = await fmpService.checkConnection();
        results.push({
            check: 'API Connection (FMP)',
            status: fmpStatus.success ? 'PASS' : 'FAIL',
            details: fmpStatus.message
        });
    } catch (e) {
        results.push({ check: 'API Connection (FMP)', status: 'FAIL', details: (e as Error).message });
    }

    // 2. Check Dynamic Universe
    try {
        const universe = await tickerUniverseService.getUniverse();
        const count = universe.length;
        results.push({
            check: 'Dynamic Universe',
            status: count > 0 ? 'PASS' : 'WARN',
            details: `Universe contains ${count} tickers`
        });
    } catch (e) {
        results.push({ check: 'Dynamic Universe', status: 'FAIL', details: 'Service Failed' });
    }

    // 3. Validate Top 3 Generation (Deep Brain)
    try {
        console.log('   -> Generating Top 3 Bundle...');
        const top3 = await unifiedIntelligenceFactory.generateDailyTop3();
        
        if (top3.length === 0) {
            results.push({ check: 'Top 3 Output', status: 'WARN', details: 'Returned 0 picks (Market conditions or data gap)' });
        } else {
            const sample = top3[0];
            const hasPlan = sample.trade_plan && typeof sample.trade_plan.entry_primary === 'number';
            
            if (hasPlan) {
                results.push({
                    check: 'Top 3 Integrity',
                    status: 'PASS',
                    details: `Generated ${top3.length} picks. Top: ${sample.ticker} (${sample.scoring.weighted_confidence}%)`
                });
            } else {
                results.push({
                    check: 'Top 3 Integrity',
                    status: 'FAIL',
                    details: 'Picks generated but missing critical fields (Score/Plan)'
                });
            }
        }
    } catch (e) {
        results.push({ check: 'Top 3 Generation', status: 'FAIL', details: (e as Error).message });
    }

    // 4. Validate Portfolio Analysis
    try {
        console.log('   -> Analyzing Portfolio...');
        const analysis = await portfolioIntelligenceEngine.analyzePortfolio(1);
        
        if (analysis.portfolio_metrics && analysis.positions) {
            results.push({
                check: 'Portfolio Engine',
                status: 'PASS',
                details: `Analyzed ${analysis.positions.length} positions. Risk: ${analysis.portfolio_metrics.risk_level}`
            });
        } else {
            results.push({ check: 'Portfolio Engine', status: 'FAIL', details: 'Invalid structure returned' });
        }
    } catch (e) {
        results.push({ check: 'Portfolio Engine', status: 'FAIL', details: (e as Error).message });
    }

    return results;
}

// -----------------------------------------------------------------------------
// REPORT GENERATOR
// -----------------------------------------------------------------------------

async function main() {
    console.log('🛡️  MARKET_AI SYSTEM INTEGRITY SCANNER v1.0');
    console.log('============================================');

    // 1. Static Scan
    console.log('📂 Starting Static Code Analysis...');
    const staticIssues = await runStaticAnalysis(path.join(ROOT_DIR, 'src'));
    console.log(`   Found ${staticIssues.length} static anomalies.`);

    // 2. Runtime Scan
    const runtimeResults = await runRuntimeAnalysis();

    // 3. Compilation
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            static_issues: staticIssues.length,
            runtime_tests: runtimeResults.length,
            runtime_passed: runtimeResults.filter(r => r.status === 'PASS').length,
            status: (staticIssues.length === 0 && runtimeResults.every(r => r.status === 'PASS')) ? 'CLEAN' : 'WARNING'
        },
        runtime_diagnostics: runtimeResults,
        static_anomalies: staticIssues
    };

    // 4. Save
    const docDir = path.dirname(REPORT_PATH);
    if (!fs.existsSync(docDir)) {
        fs.mkdirSync(docDir, { recursive: true });
    }

    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log('\n============================================');
    console.log(`📄 Report Saved: ${REPORT_PATH}`);
    
    // 5. Console Summary
    if (staticIssues.length > 0) {
        console.log('\n⚠️  STATIC ISSUES DETECTED (Sample):');
        staticIssues.slice(0, 5).forEach(i => console.log(`   - ${i.file}:${i.line} -> ${i.issue}`));
        if (staticIssues.length > 5) console.log(`   ...and ${staticIssues.length - 5} more.`);
    }

    console.log('\n⚡ RUNTIME DIAGNOSTICS:');
    runtimeResults.forEach(r => {
        const icon = r.status === 'PASS' ? '✅' : r.status === 'WARN' ? '⚠️' : '❌';
        console.log(`   ${icon} ${r.check}: ${r.details}`);
    });

    if (report.summary.status === 'CLEAN') {
        console.log('\n✅ SYSTEM INTEGRITY CERTIFIED.');
        process.exit(0);
    } else {
        console.log('\n❌ INTEGRITY WARNINGS FOUND. Review report.');
        process.exit(0);
    }
}

main().catch(console.error);
