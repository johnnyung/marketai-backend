import unifiedIntelligenceFactory from './unifiedIntelligenceFactory.js';
import globalMacroForecastService from './globalMacroForecastService.js';
import { adaptForTopPicks } from '../utils/uiResponseAdapter.js';

class AnalysisService {
    /**
     * Runs the full "Step 2" Analysis Cycle.
     * 1. Generates Top Picks based on fresh data.
     * 2. Synthesizes Macro Environment.
     * 3. Returns a dashboard-ready summary.
     */
    async runFullAnalysis() {
        console.log('[ANALYSIS] Starting Full Brain Cycle...');
        
        // 1. Macro Synthesis
        const macro = await globalMacroForecastService.generateForecast();
        
        // 2. Top Picks Generation (Uses the Factory we fixed in Phase 38)
        // This scans the universe and scores tickers
        const bundles = await unifiedIntelligenceFactory.generateTopPicks();
        const topPicks = bundles.map(b => adaptForTopPicks(b));

        // 3. Catalyst/Events (Placeholder for future expansion)
        const catalysts = [
            { type: 'MACRO', summary: `Inflation Trend: ${macro.inflation.trend}`, impact: 'HIGH' },
            { type: 'LIQUIDITY', summary: `Fed Rate: ${macro.liquidity.fed_rate}`, impact: 'MEDIUM' }
        ];

        return {
            success: true,
            timestamp: new Date().toISOString(),
            macro_summary: {
                score: macro.health_score,
                regime: macro.summary,
                details: macro
            },
            top_opportunities: topPicks,
            catalysts: catalysts
        };
    }

    async getMacroSummary() {
        return await globalMacroForecastService.generateForecast();
    }
}

export default new AnalysisService();
