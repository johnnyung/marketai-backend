import fmpService from './fmpService.js';

interface MarketRegime {
    regime: 'RISK_ON' | 'RISK_OFF' | 'NEUTRAL';
    bias: 'GROWTH' | 'DEFENSIVE' | 'BALANCED';
    description: string;
    indicators: {
        yield10y: number;
        cpi: number;
        trend: string;
    }
}

class MacroRegimeService {

    async getRegime(): Promise<MarketRegime> {
        console.log("   🌍 Macro: Analyzing Economic Weather...");
        
        try {
            // 1. Fetch Data
            const [treasury, cpiData] = await Promise.all([
                fmpService.getTreasuryRates(),
                fmpService.getEconomicIndicator('CPI')
            ]);

            // 2. Parse 10Y Yield (Proxy for cost of capital)
            const latestYield = treasury && treasury.length > 0 ? treasury[0].year10 : 4.0;
            const prevYield = treasury && treasury.length > 5 ? treasury[5].year10 : 4.0;
            
            // 3. Parse CPI (Inflation)
            const latestCPI = cpiData && cpiData.length > 0 ? parseFloat(cpiData[0].value) : 3.0;
            
            // 4. Determine Regime
            let regime: 'RISK_ON' | 'RISK_OFF' | 'NEUTRAL' = 'NEUTRAL';
            let bias: 'GROWTH' | 'DEFENSIVE' | 'BALANCED' = 'BALANCED';
            let trend = 'Stable';

            const yieldChange = latestYield - prevYield;

            if (yieldChange > 0.1 || latestCPI > 3.5) {
                // Rising rates or high inflation -> Fear
                regime = 'RISK_OFF';
                bias = 'DEFENSIVE';
                trend = 'Tightening';
            } else if (yieldChange < -0.05 && latestCPI < 3.0) {
                // Falling rates + controlled inflation -> Greed
                regime = 'RISK_ON';
                bias = 'GROWTH';
                trend = 'Easing';
            }

            const description = `10Y Yield is ${latestYield}% (${trend}). Inflation (CPI) at ${latestCPI}%. Market bias: ${bias}.`;
            
            console.log(`      -> ${description}`);

            return {
                regime,
                bias,
                description,
                indicators: {
                    yield10y: latestYield,
                    cpi: latestCPI,
                    trend
                }
            };

        } catch (e) {
            console.error("Macro Analysis Failed:", e);
            // Safe Fallback
            return {
                regime: 'NEUTRAL',
                bias: 'BALANCED',
                description: 'Macro data unavailable, assuming neutral market.',
                indicators: { yield10y: 4.0, cpi: 3.0, trend: 'Unknown' }
            };
        }
    }
}

export default new MacroRegimeService();
