import axios from 'axios';

const FMP_KEY = process.env.FMP_API_KEY;

interface InsiderBreak {
  is_break: boolean;
  pattern_type: 'REVERSAL_BUY' | 'CLUSTER_BUY' | 'DORMANT_WAKEUP' | 'CEO_ENTRY' | 'CFO_ENTRY' | 'NONE';
  confidence_boost: number;
  reason: string;
  details: string;
}

class InsiderPatternService {

  async analyzePattern(ticker: string): Promise<InsiderBreak> {
    if (!FMP_KEY) return { is_break: false, pattern_type: 'NONE', confidence_boost: 0, reason: 'No API Key', details: '' };

    try {
        // 1. Get Insider History (Last 100 transactions)
        const url = `https://financialmodelingprep.com/stable/insider-trading?symbol=${ticker}&limit=100&apikey=${FMP_KEY}`;
        const res = await axios.get(url, { timeout: 5000 });
        const trades = res.data;

        if (!Array.isArray(trades) || trades.length < 2) {
            return { is_break: false, pattern_type: 'NONE', confidence_boost: 0, reason: 'Insufficient Data', details: '' };
        }

        // Filter to recent (last 30 days)
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        const recentTrades = trades.filter((t: any) => new Date(t.transactionDate) >= thirtyDaysAgo);
        
        if (recentTrades.length === 0) {
            return { is_break: false, pattern_type: 'NONE', confidence_boost: 0, reason: 'No recent activity', details: '' };
        }

        // --- PATTERN RECOGNITION LOGIC ---

        // 1. CLUSTER BUY (The Swarm)
        const buyers = new Set(recentTrades.filter((t: any) => t.transactionType.includes('P-Purchase') || t.transactionType.includes('Buy')).map((t: any) => t.reportingName));
        
        if (buyers.size >= 3) {
            return {
                is_break: true,
                pattern_type: 'CLUSTER_BUY',
                confidence_boost: 25,
                reason: `CLUSTER BUY: ${buyers.size} unique insiders bought recently.`,
                details: `Buyers: ${Array.from(buyers).join(', ')}`
            };
        }

        // 2. CEO/CFO HIGH CONVICTION (The Captain)
        const cSuiteBuy = recentTrades.find((t: any) =>
            (t.typeOfOwner.includes('CEO') || t.typeOfOwner.includes('CFO') || t.typeOfOwner.includes('Chief')) &&
            (t.transactionType.includes('P-Purchase') || t.transactionType.includes('Buy')) &&
            (t.securitiesTransacted * t.price) > 100000
        );

        if (cSuiteBuy) {
             return {
                is_break: true,
                pattern_type: cSuiteBuy.typeOfOwner.includes('CFO') ? 'CFO_ENTRY' : 'CEO_ENTRY',
                confidence_boost: 20,
                reason: `C-SUITE BUY: ${cSuiteBuy.typeOfOwner} bought $${(cSuiteBuy.securitiesTransacted * cSuiteBuy.price).toLocaleString()}.`,
                details: `${cSuiteBuy.reportingName} @ $${cSuiteBuy.price}`
            };
        }

        // 3. REVERSAL BUY (The Pivot)
        const latest = recentTrades[0];
        if (latest.transactionType.includes('Purchase')) {
            const history = trades.slice(recentTrades.length);
            const prev5 = history.slice(0, 5);
            const allSells = prev5.every((t: any) => t.transactionType.includes('Sale') || t.transactionType.includes('S-Sale'));
            
            if (allSells && prev5.length >= 5) {
                return {
                    is_break: true,
                    pattern_type: 'REVERSAL_BUY',
                    confidence_boost: 15,
                    reason: `REVERSAL: First buy after ${prev5.length}+ consecutive sells.`,
                    details: `Insider sentiment shifting.`
                };
            }
        }

        return { is_break: false, pattern_type: 'NONE', confidence_boost: 0, reason: 'Routine Activity', details: '' };

    } catch (e) {
        return { is_break: false, pattern_type: 'NONE', confidence_boost: 0, reason: 'Error', details: '' };
    }
  }
}

export default new InsiderPatternService();
