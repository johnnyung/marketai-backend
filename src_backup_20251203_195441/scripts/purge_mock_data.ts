import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '../../');
const REPORT_PATH = path.resolve(ROOT_DIR, 'mock_purge_report.json');

// Patterns to hunt
const TOXIC_PATTERNS = [
    { regex: /Math\.random\(\)/g, replacement: '0 /* PURGED RANDOM */', label: 'Random Generator' },
    { regex: /const mock.*= \[/g, replacement: 'const purgedMock = [ /* DATA REMOVED */ ', label: 'Mock Array' },
    { regex: /return \{.*price: 150.*\}/g, replacement: 'return null /* PURGED FAKE PRICE */', label: 'Hardcoded Price' },
    { regex: /'Mock Inc'/g, replacement: "'[REAL DATA REQUIRED]'", label: 'Fake Company' },
    { regex: /fallback/gi, replacement: 'legacy_fallback', label: 'Fallback Logic' }
];

const EXCLUDE_DIRS = ['node_modules', 'dist', 'build', '.git', 'scripts']; // Scripts excluded to avoid self-flagging

async function scanDirectory(dir: string): Promise<any[]> {
    let results: any[] = [];
    const list = fs.readdirSync(dir);
    
    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            if (!EXCLUDE_DIRS.includes(file)) {
                results = results.concat(await scanDirectory(fullPath));
            }
        } else if (file.endsWith('.ts') && !file.includes('purge_mock_data')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            let failures: string[] = [];
            
            TOXIC_PATTERNS.forEach(p => {
                if (p.regex.test(content)) {
                    failures.push(p.label);
                }
            });

            if (failures.length > 0) {
                results.push({
                    file: path.relative(ROOT_DIR, fullPath),
                    issues: failures
                });
            }
        }
    }
    return results;
}

async function run() {
    console.log('🕵️  STARTING MOCK DATA PURGE SCAN...');
    const findings = await scanDirectory(path.join(ROOT_DIR, 'src'));
    
    fs.writeFileSync(REPORT_PATH, JSON.stringify(findings, null, 2));
    
    console.log(`✅ Scan Complete. Found ${findings.length} contaminated files.`);
    console.log(`📄 Report saved to: ${REPORT_PATH}`);
    
    if (findings.length > 0) {
        console.log('\nTOP OFFENDERS:');
        findings.slice(0, 5).forEach(f => console.log(`- ${f.file}: ${f.issues.join(', ')}`));
    }
}

run();
