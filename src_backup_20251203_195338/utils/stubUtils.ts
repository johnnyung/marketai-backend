/**
 * STUB REPLACEMENT TOOLKIT
 * Provides standardized "Degraded" objects to prevent null-pointer crashes.
 */
export const StubUtils = {
    
    getNeutralSignal(source: string) {
        return {
            score: 50,
            signal: 'NEUTRAL',
            confidence: 0,
            reason: `${source} Unavailable`,
            details: []
        };
    },

    getEmptyTechnical() {
        return {
            rsi: 50,
            macd: { macd: 0, signal: 0, histogram: 0 },
            movingAverages: { sma50: 0, sma200: 0 },
            signal: 'NEUTRAL'
        };
    },

    getDegradedMarketEcho() {
        return [{
            event_name: 'Market Noise',
            resonance_score: 50,
            narrative_parallel: 'No strong parallel detected',
            affected_sectors: []
        }];
    },

    getNeutralMacro() {
        return {
            source: 'System',
            type: 'macro_indicator',
            title: 'Macro Data Neutral',
            content: 'Data currently unavailable',
            metadata: {}
        };
    }
};
