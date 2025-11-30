import pool from '../db/index.js';
import fmpService from './fmpService.js';
import marketDataService from './marketDataService.js';

// Top Performing Funds to Track
const ELITE_FUNDS = [
  { name: 'Berkshire (Buffett)', cik: '0001067983' },
  { name: 'Bridgewater (Dalio)', cik: '0001350694' },
  { name: 'Renaissance (Simons)', cik: '0001037389' },
  { name: 'Citadel (Griffin)', cik: '0001423053' },
  { name: 'Pershing (Ackman)', cik: '0001336528' },
  { name: 'Scion (Burry)', cik: '0001649339' },
  { name: 'Appaloosa (Tepper)', cik: '0001006438' },
  { name: 'Duquesne (Druckenmiller)', cik: '0001536411' }
];

interface FootprintSignal {
  ticker: string;
  type: 'CLUSTER_BUY' | 'BLOCK_TRADE' | 'SECTOR_ROTATION';
  intensity: number;
  details: string;
  funds?: string[];
}

class SmartMoneyService {

  async scanFootprints(): Promise<FootprintSignal[]> {
    console.log('      👣 Smart Money: Scanning Institutional Footprints...');
    
    const signals: FootprintSignal[] = [];

    // 1. CLUSTER BUYS (High Conviction)
    try {
        const holdingsMap = new Map<string, string[]>();
        
        for (const fund of ELITE_FUNDS) {
            const holdings = await fmpService.get13F(fund.cik);
            // Take top 5 holdings
            holdings.slice(0, 5).forEach((h: any) => {
                const ticker = h.symbol || h.tickbum;
                if (ticker) {
                    if (!holdingsMap.has(ticker)) holdingsMap.set(ticker, []);
                    holdingsMap.get(ticker)?.push(fund.name);
                }
            });
            await new Promise(r => setTimeout(r, 200)); // Rate limit
        }

        for (const [ticker, funds] of holdingsMap.entries()) {
            if (funds.length >= 2) {
                signals.push({
                    ticker,
                    type: 'CLUSTER_BUY',
                    intensity: Math.min(100, 75 + (funds.length * 10)),
                    details: `Held by ${funds.length} Titans: ${funds.join(', ')}`,
                    funds
                });
                console.log(`      -> 🤝 CLUSTER: ${ticker} held by ${funds.length} elite funds.`);
            }
        }
    } catch (e) { console.error("Cluster Scan Error", e); }

    // 2. BLOCK TRADE / STEALTH ACCUMULATION
    try {
        // Scan a watchlist of liquid stocks for volume anomalies
        const watchlist = ['NVDA', 'AMD', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA', 'PLTR', 'SOFI'];
        const quotes = await marketDataService.getMultiplePrices(watchlist);
        
        for (const [ticker, quote] of quotes.entries()) {
            const profile = await fmpService.getCompanyProfile(ticker);
            const avgVol = profile?.volAvg || 1000000;
            
            if (quote.volume > avgVol * 2.5 && Math.abs(quote.changePercent) < 1.0) {
                signals.push({
                    ticker,
                    type: 'BLOCK_TRADE',
                    intensity: 85,
                    details: `Stealth Accumulation: Volume ${((quote.volume/avgVol)).toFixed(1)}x avg, but price flat.`
                });
                console.log(`      -> 🧱 BLOCK: ${ticker} volume spike (Absorption).`);
            }
        }
    } catch (e) {}

    // 3. SECTOR ROTATION (ETF Flows)
    try {
        const sectors = ['XLK', 'XLE', 'XLV', 'XLF', 'XLI'];
        const quotes = await marketDataService.getMultiplePrices(sectors);
        const sorted = sectors
            .map(s => ({ t: s, q: quotes.get(s) }))
            .filter(x => x.q)
            .sort((a, b) => (b.q?.changePercent || 0) - (a.q?.changePercent || 0));

        if (sorted.length > 0) {
            const winner = sorted[0];
            const loser = sorted[sorted.length - 1];
            
            // Significant divergence (>1.5% spread)
            if ((winner.q?.changePercent || 0) - (loser.q?.changePercent || 0) > 1.5) {
                signals.push({
                    ticker: winner.t,
                    type: 'SECTOR_ROTATION',
                    intensity: 80,
                    details: `Capital rotating from ${loser.t} to ${winner.t} (Spread: ${((winner.q?.changePercent || 0) - (loser.q?.changePercent || 0)).toFixed(2)}%)`
                });
                console.log(`      -> 🔄 ROTATION: Into ${winner.t}, Out of ${loser.t}`);
            }
        }
    } catch (e) {}

    // Save to DB
    await this.saveSignals(signals);
    
    return signals;
  }

  private async saveSignals(signals: FootprintSignal[]) {
      await pool.query("DELETE FROM smart_money_signals"); // Keep only fresh signals
      for (const s of signals) {
          await pool.query(`
              INSERT INTO smart_money_signals (ticker, signal_type, intensity, details, source_funds, detected_at)
              VALUES ($1, $2, $3, $4, $5, NOW())
          `, [s.ticker, s.type, s.intensity, s.details, JSON.stringify(s.funds || [])]);
      }
  }
}

export default new SmartMoneyService();
