import portfolioIntelligenceEngine from '../../services/portfolioIntelligenceEngine.js';
import dotenv from 'dotenv';

dotenv.config();

async function auditPortfolio() {
    console.log('=== STARTING PORTFOLIO ENGINE AUDIT ===');
    
    try {
        const start = Date.now();
        const result = await portfolioIntelligenceEngine.analyzePortfolio(1);
        const duration = (Date.now() - start) / 1000;

        console.log(`\nAnalysis Time: ${duration}s`);
        console.log(`Total Value: $${result.portfolio_metrics.total_value.toFixed(2)}`);
        console.log(`Risk Level: ${result.portfolio_metrics.risk_level}`);
        console.log(`Positions Analyzed: ${result.positions.length}`);

        console.log('\n--- POSITION DETAILS ---');
        result.positions.forEach(p => {
            console.log(`[${p.ticker}] Score: ${p.intelligence.scoring.weighted_confidence} | Rec: ${p.recommendation}`);
            if (p.intelligence.engines.fsi.traffic_light === 'RED') {
                console.log('   ⚠️ FSI WARNING: Fundamental Health Critical');
            }
        });

        if (result.positions.length > 0) {
            console.log('\n✅ PASS: Portfolio Engine is fully active.');
            process.exit(0);
        } else {
            console.error('❌ FAIL: No positions returned.');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ CRASH:', error);
        process.exit(1);
    }
}

auditPortfolio();
