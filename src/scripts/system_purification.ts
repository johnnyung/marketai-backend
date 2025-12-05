import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import unifiedIntelligenceFactory from '../services/unifiedIntelligenceFactory.js';
import tickerUniverseService from '../services/tickerUniverseService.js';

interface EngineAudit {
    file: string;
    has_static_50: boolean;
    has_mock_keyword: boolean;
    has_hardcoded_return: boolean;
    status: 'CLEAN' | 'SUSPICIOUS';
}

async function runPurification() {
    console.log('\n🛡️  STARTING FULL SYSTEM PURIFICATION SCAN');
    console.log('================================================');

    const report: any = {
        timestamp: new Date().toISOString(),
        static_analysis: [],
        runtime_analysis: {},
        final_verdict: 'PENDING'
    };

    // 1. STATIC CODE ANALYSIS
    console.log('🔍 Scanning Engine Source Code...');
    const servicesDir = path.resolve(process.cwd(), 'src/services');
    const files = fs.readdirSync(servicesDir).filter(f => f.endsWith('.ts') || f.endsWith(''));

    let staticFailures = 0;

    for (const file of files) {
        if (!file.includes('Engine') && !file.includes('Service')) continue;

        const content = fs.readFileSync(path.join(servicesDir, file), 'utf-8');
        const audit: EngineAudit = {
            file,
            has_static_50: /score:\s*50\s*[},]/.test(content),
            has_mock_keyword: /mock/i.test(content) && !file.includes('test'),
            has_hardcoded_return: /return\s*{\s*score:\s*0/.test(content),
            status: 'CLEAN'
        };

        if (audit.has_static_50 || audit.has_mock_keyword) {
            audit.status = 'SUSPICIOUS';
            staticFailures++;
            console.log(`   ⚠️  ${file}: Potential static artifact detected.`);
        }
        report.static_analysis.push(audit);
    }

    console.log(`   Static Audit Complete. Suspicious Files: ${staticFailures}`);

    // 2. RUNTIME VALIDATION
    console.log('\n⚙️  Verifying Live Data Integrity (AAPL)...');
    try {
        const bundle = await unifiedIntelligenceFactory.generateBundle('AAPL');
        
        const engineStates = Object.entries(bundle.engines).map(([key, data]: [string, any]) => {
            // NULL SAFETY CHECK
            if (!data) {
                return {
                    engine: key,
                    score: 0,
                    fallback_used: true,
                    details_count: 0,
                    status: 'NULL_DATA'
                };
            }

            return {
                engine: key,
                score: data.score ?? data.confidence ?? 0,
                fallback_used: !!data.fallback_used,
                details_count: data.details?.length || 0
            };
        });

        const fallbacks = engineStates.filter(e => e.fallback_used).length;
        const total = engineStates.length;
        const healthScore = Math.round(((total - fallbacks) / total) * 100);

        report.runtime_analysis = {
            target: 'AAPL',
            final_score: bundle.scoring.weighted_confidence,
            engines_total: total,
            engines_fallback: fallbacks,
            health_score: healthScore,
            details: engineStates
        };

        console.log(`   Runtime Health: ${healthScore}/100`);
        console.log(`   Final Score: ${bundle.scoring.weighted_confidence.toFixed(1)}`);

        if (healthScore < 30) {
            console.error('   ❌ CRITICAL: System is running mostly on fallbacks.');
            report.final_verdict = 'FAILED - LOW HEALTH';
        } else {
            console.log('   ✅ System is operational.');
            report.final_verdict = 'CLEAN';
        }

    } catch (e: any) {
        console.error('   ❌ Runtime Check Failed:', e.message);
        report.final_verdict = 'CRITICAL FAILURE';
        report.error = e.message;
    }

    // 3. DUMP REPORT
    const reportPath = path.resolve(process.cwd(), 'logs/optimized_state_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Optimized State Report saved to: logs/optimized_state_report.json`);
    console.log('================================================');
    process.exit(0);
}

runPurification();
