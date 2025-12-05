// ============================================================
// Insider Pattern Engine (2025 Stable API Compatible)
// ============================================================
// Purpose:
// Analyzes insider trades for patterns like:
// - Clustered Buying
// - Large Disposals
// - Mixed Signals
// - Quiet Periods
// ============================================================

import fmpService from './fmpService.js';

class InsiderPatternEngine {
    async analyze(ticker: string) {
        try {
            const trades = await fmpService.getInsiderTrades(ticker);

            if (!trades || trades.length === 0) {
                return {
                    ticker,
                    pattern: 'NO_ACTIVITY',
                    score: 0,
                    summary: 'No recent insider activity detected.',
                    insiders: []
                };
            }

            // Extract metrics
            let buys = 0;
            let sells = 0;
            const insiders = new Set<string>();

            trades.forEach((t: any) => {
                const type = (t.acquistionOrDisposition || '').toUpperCase();
                const shares = parseInt(t.securitiesTransacted || 0);

                insiders.add(t.reportingName);

                if (type === 'A') buys += shares;
                if (type === 'D') sells += shares;
            });

            const net = buys - sells;

            // Determine pattern
            let pattern = 'NEUTRAL';
            if (net > 0) pattern = 'ACCUMULATION';
            if (net < 0) pattern = 'DISTRIBUTION';
            if (buys === 0 && sells > 0) pattern = 'HEAVY_SELLING';
            if (sells === 0 && buys > 0) pattern = 'HEAVY_BUYING';

            // Score logic
            const score = Math.min(100, Math.abs(net) / 1000);

            return {
                ticker,
                pattern,
                score,
                summary: `Net insider flow: ${net} shares`,
                insiders: Array.from(insiders).slice(0, 10)
            };

        } catch (e: any) {
            return {
                ticker,
                pattern: 'ERROR',
                score: 0,
                summary: 'Error analyzing insider trades',
                insiders: []
            };
        }
    }
}

export default new InsiderPatternEngine();
