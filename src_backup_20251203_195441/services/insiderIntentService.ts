import fmpService from './fmpService.js';

class InsiderIntentService {
  async analyzeIntent(ticker: string) {
    try {
        const trades = await fmpService.getInsiderTrades(ticker);
        
        // PRIMARY LOGIC
        if (trades && trades.length > 0) {
            let score = 50;
            let net = 0;
            trades.slice(0, 10).forEach((t: any) => {
                if (t.acquistionOrDisposition === 'A') { score += 5; net++; }
                else { score -= 5; net--; }
            });
            score = Math.max(10, Math.min(90, score));
            
            return {
                ticker,
                confidence: score,
                classification: net > 0 ? 'ACCUMULATION' : 'DISTRIBUTION',
                signal_strength: Math.abs(net),
                details: `${net > 0 ? 'Net Buying' : 'Net Selling'} detected`,
                insiders_involved: trades.slice(0,3).map((t:any) => t.reportingName)
            };
        }

        // FALLBACK LOGIC: Price vs Open Proxy
        const quote = await fmpService.getPrice(ticker);
        const price = quote?.price || 0;
        const open = quote?.open || price;
        const isAccum = price > open;
        
        return {
            ticker,
            confidence: isAccum ? 60 : 40,
            classification: isAccum ? 'ACCUMULATION' : 'DISTRIBUTION',
            signal_strength: 1,
            details: 'Synthetic: Intraday Accumulation Proxy',
            insiders_involved: []
        };

    } catch (e) {
        return { ticker, confidence: 0, classification: 'UNKNOWN', details: 'Error', signal_strength: 0, insiders_involved: [] };
    }
  }
}
export default new InsiderIntentService();
