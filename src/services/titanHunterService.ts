import fmpService from './fmpService.js';

// The "Titans" - Top performing funds to track
const TITAN_FUNDS = [
    { name: 'Berkshire Hathaway (Buffett)', cik: '0001067983', strategy: 'blue_chip' },
    { name: 'Bridgewater (Dalio)', cik: '0001350694', strategy: 'blue_chip' },
    { name: 'Renaissance Tech (Simons)', cik: '0001037389', strategy: 'explosive_growth' },
    { name: 'Citadel (Griffin)', cik: '0001423053', strategy: 'explosive_growth' },
    { name: 'Pershing Square (Ackman)', cik: '0001336528', strategy: 'blue_chip' },
    { name: 'Scion Asset (Burry)', cik: '0001649339', strategy: 'explosive_growth' },
    { name: 'Appaloosa (Tepper)', cik: '0001006438', strategy: 'explosive_growth' },
    { name: 'Duquesne (Druckenmiller)', cik: '0001536411', strategy: 'explosive_growth' },
    { name: 'Tiger Global', cik: '0001167483', strategy: 'explosive_growth' }
];

class TitanHunterService {

  async hunt() {
    console.log('   🏛️  Titan Hunter: Scanning Institutional Portfolios...');
    
    const opportunities = [];

    for (const fund of TITAN_FUNDS) {
        // Rate limit courtesy
        await new Promise(r => setTimeout(r, 500));
        
        try {
            const holdings = await fmpService.get13F(fund.cik);
            
            if (holdings && holdings.length > 0) {
                // 1. High Conviction: Top 3 Holdings
                const topPicks = holdings.slice(0, 3);
                
                for (const stock of topPicks) {
                    // Filter out obvious noise/indices if possible, but FMP usually gives tickers
                    if (stock.tickbum) { // FMP often returns 'tickbum' or 'symbol'
                         const ticker = stock.tickbum || stock.symbol;
                         
                         // Only add if it's a valid ticker string
                         if (ticker && /^[A-Z]+$/.test(ticker)) {
                             opportunities.push({
                                 ticker: ticker,
                                 action: "BUY",
                                 tier: fund.strategy,
                                 confidence: 92,
                                 reason: `[Titan Conviction] Top holding of ${fund.name}. Institutional validation.`,
                                 category: "Institutional"
                             });
                         }
                    }
                }
            }
        } catch (e) { 
            // console.warn(`Failed to scan ${fund.name}`); 
        }
    }
    
    // Deduplicate results (multiple funds owning the same stock = higher conviction)
    const uniqueOps = new Map();
    opportunities.forEach(op => {
        if (uniqueOps.has(op.ticker)) {
            const existing = uniqueOps.get(op.ticker);
            // Boost confidence if multiple titans hold it
            existing.confidence = Math.min(99, existing.confidence + 5);
            existing.reason += ` ALSO held by another Titan.`;
        } else {
            uniqueOps.set(op.ticker, op);
        }
    });

    const finalResults = Array.from(uniqueOps.values());
    console.log(`      -> Titan Hunter identified ${finalResults.length} institutional picks.`);
    return finalResults;
  }
}

export default new TitanHunterService();
