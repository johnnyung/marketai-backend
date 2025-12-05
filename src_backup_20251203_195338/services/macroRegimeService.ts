import globalMacroForecastService from './globalMacroForecastService.js';

interface MarketRegime {
    regime: 'RISK_ON' | 'RISK_OFF' | 'NEUTRAL' | 'STAGFLATION' | 'REFLATION';
    bias: 'GROWTH' | 'DEFENSIVE' | 'BALANCED' | 'COMMODITIES';
    description: string;
    indicators: any;
}

class MacroRegimeService {

    async getRegime(): Promise<MarketRegime> {
        // console.log("   🌍 Macro: Analyzing Economic Weather (via GMF)...");
        
        try {
            const gmf = await globalMacroForecastService.generateForecast();

            let regime: MarketRegime['regime'] = 'NEUTRAL';
            let bias: MarketRegime['bias'] = 'BALANCED';

            // LOGIC MATRIX
            if (gmf.growth.trend === 'EXPANDING' && gmf.inflation.trend === 'COOLING') {
                regime = 'RISK_ON'; // Goldilocks
                bias = 'GROWTH';
            } else if (gmf.growth.trend === 'CONTRACTING' && gmf.inflation.trend === 'HEATING') {
                regime = 'STAGFLATION'; // Worst case
                bias = 'COMMODITIES';
            } else if (gmf.growth.trend === 'EXPANDING' && gmf.inflation.trend === 'HEATING') {
                regime = 'REFLATION'; // Nominal growth high
                bias = 'BALANCED';
            } else if (gmf.liquidity.trend === 'TIGHTENING' || gmf.liquidity.yield_curve < -0.5) {
                regime = 'RISK_OFF'; // Fed breaking things
                bias = 'DEFENSIVE';
            }

            // VSA Override (if Score is very low)
            if (gmf.health_score < 30) {
                regime = 'RISK_OFF';
                bias = 'DEFENSIVE';
            }

            return {
                regime,
                bias,
                description: gmf.summary,
                indicators: {
                    gmf_score: gmf.health_score,
                    inflation: gmf.inflation.cpi,
                    yield_curve: gmf.liquidity.yield_curve,
                    dxy: gmf.currency.dxy
                }
            };

        } catch (e) {
            console.error("Macro Analysis Failed:", e);
            return {
                regime: 'NEUTRAL',
                bias: 'BALANCED',
                description: 'Macro data unavailable.',
                indicators: {}
            };
        }
    }
}

export default new MacroRegimeService();
