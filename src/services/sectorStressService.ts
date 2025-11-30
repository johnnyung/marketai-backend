import marketDataService from './marketDataService.js';

interface SectorStress {
  sector: string;
  ticker: string;
  stress_score: number; // 0-100
  regime: 'CALM' | 'ROTATION' | 'LIQUIDATION' | 'PANIC';
  change_vs_spy: number;
  reason: string;
}

const SECTORS = [
    { name: 'Technology', ticker: 'XLK' },
    { name: 'Energy', ticker: 'XLE' },
    { name: 'Financials', ticker: 'XLF' },
    { name: 'Healthcare', ticker: 'XLV' },
    { name: 'Consumer Discretionary', ticker: 'XLY' },
    { name: 'Consumer Staples', ticker: 'XLP' },
    { name: 'Utilities', ticker: 'XLU' },
    { name: 'Materials', ticker: 'XLB' },
    { name: 'Industrials', ticker: 'XLI' },
    { name: 'Real Estate', ticker: 'XLRE' },
    { name: 'Comms', ticker: 'XLC' }
];

class SectorStressService {

  async analyzeSectors(): Promise<SectorStress[]> {
    console.log('      🌡️  Sector Stress: Measuring Systemic Pressure...');
    
    const results: SectorStress[] = [];
    
    try {
        // 1. Get SPY baseline
        const spyQuote = await marketDataService.getStockPrice('SPY');
        const spyChange = spyQuote?.changePercent || 0;

        // 2. Batch fetch sectors using v86 Granular Protocol
        const tickers = SECTORS.map(s => s.ticker);
        const quotes = await marketDataService.getMultiplePrices(tickers);

        for (const sector of SECTORS) {
            const quote = quotes.get(sector.ticker);
            if (!quote) continue;

            // 3. Calculate Stress Components
            const relPerf = quote.changePercent - spyChange;
            const absMove = Math.abs(quote.changePercent);
            
            let score = 0;
            
            // Base Stress from Movement
            score += (absMove * 10);

            // Penalty for lagging market significantly (Relative Weakness)
            if (relPerf < -1.0) score += 20;
            if (relPerf < -2.0) score += 30;

            // Cap at 100
            score = Math.min(100, Math.round(score));

            // 4. Determine Regime
            let regime: SectorStress['regime'] = 'CALM';
            if (score > 80) regime = 'PANIC';
            else if (score > 60) regime = 'LIQUIDATION';
            else if (score > 30) regime = 'ROTATION';

            results.push({
                sector: sector.name,
                ticker: sector.ticker,
                stress_score: score,
                regime,
                change_vs_spy: parseFloat(relPerf.toFixed(2)),
                reason: `${sector.ticker} ${quote.changePercent > 0 ? 'Up' : 'Down'} ${Math.abs(quote.changePercent).toFixed(2)}% (Rel: ${relPerf > 0 ? '+' : ''}${relPerf.toFixed(2)}%)`
            });
        }

    } catch (e) {
        console.error("Sector Stress Error:", e);
    }

    return results;
  }
}

export default new SectorStressService();
