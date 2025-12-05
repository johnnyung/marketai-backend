import unifiedIntelligenceFactory from '../../services/unifiedIntelligenceFactory.js';
import dotenv from 'dotenv';

dotenv.config();

async function runAudit() {
    console.log('=== STARTING TOP 3 REPAIR AUDIT ===');
    try {
        const start = Date.now();
        const picks = await unifiedIntelligenceFactory.generateDailyTop3();
        const duration = (Date.now() - start) / 1000;
        
        console.log(`\nGeneration completed in ${duration}s`);
        console.log(`Picks generated: ${picks.length}`);
        
        if (picks.length > 0) {
            console.log('✅ PASS: Picks generated successfully.');
        } else {
            console.log('⚠️ WARNING: No picks returned, but system is stable.');
        }
    } catch (error) {
        console.error('❌ FAIL: Process Crashed', error);
        process.exit(1);
    }
    console.log('=== AUDIT COMPLETE ===');
    process.exit(0);
}
runAudit();
