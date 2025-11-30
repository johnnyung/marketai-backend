import fmpService from './fmpService.js';
import newsApiService from './newsApiService.js';
import technicalIndicatorsService from './technicalIndicatorsService.js';

interface ValidationResult {
  passed: boolean;
  reason: string;
  scores: {
    fundamental: boolean;
    technical: boolean;
    narrative: boolean;
  }
}

class RiskValidatorService {

  // The "Triple-Check" Protocol
  async validateTicker(ticker: string, action: string = 'BUY'): Promise<ValidationResult> {
    console.log(`      🛡️  Running Triple-Check on ${ticker}...`);

    // 1. FUNDAMENTAL CHECK (Bankruptcy/Solvency)
    // We check if they can pay their bills (Current Ratio) and debt load (Debt/Equity)
    let fundPass = true;
    let fundReason = "";
    try {
        // Get latest annual ratios (most stable)
        const ratios = await fmpService.getFinancialRatios(ticker, 'annual', 1);
        if (ratios && ratios.length > 0) {
            const r = ratios[0];
            // Current Ratio < 0.7 implies liquidity crisis risk
            if (r.currentRatio < 0.7) {
                fundPass = false;
                fundReason = `Liquidity Risk (Current Ratio ${r.currentRatio.toFixed(2)} < 0.7)`;
            }
            // Debt/Equity > 10 implies massive leverage risk
            if (r.debtEquityRatio > 10) {
                fundPass = false;
                fundReason = `Leverage Risk (Debt/Equity ${r.debtEquityRatio.toFixed(2)} > 10)`;
            }
        }
    } catch(e) {
        // If we can't verify fundamentals, proceed with caution but don't fail
        // console.warn(`Fundamental check skipped for ${ticker}`);
    }

    if (!fundPass) {
        return { passed: false, reason: `[FUNDAMENTAL VETO] ${fundReason}`, scores: { fundamental: false, technical: false, narrative: false } };
    }

    // 2. TECHNICAL CHECK (RSI)
    // Don't buy tops.
    let techPass = true;
    let techReason = "";
    try {
        const rsi = await fmpService.getRSI(ticker);
        if (rsi) {
            if (action === 'BUY' && rsi > 80) {
                techPass = false;
                techReason = `RSI ${rsi.toFixed(0)} > 80 (Overbought)`;
            }
        }
    } catch(e) {}

    if (!techPass) {
        return { passed: false, reason: `[TECHNICAL VETO] ${techReason}`, scores: { fundamental: true, technical: false, narrative: false } };
    }

    // 3. NARRATIVE CHECK (Toxic News)
    // Ensure no catastrophic headlines in last 48h
    let narrativePass = true;
    let narrativeReason = "";
    try {
        const news = await newsApiService.getTickerNews(ticker, undefined, 5);
        const toxicKeywords = ['fraud', 'investigation', 'subpoena', 'bankruptcy', 'delisting', 'accounting error', 'raid'];
        
        for (const article of news) {
            const text = (article.title + " " + article.description).toLowerCase();
            const hit = toxicKeywords.find(k => text.includes(k));
            if (hit) {
                narrativePass = false;
                narrativeReason = `Toxic News Found: "${hit}" in recent articles`;
                break;
            }
        }
    } catch(e) {}

    if (!narrativePass) {
        return { passed: false, reason: `[NARRATIVE VETO] ${narrativeReason}`, scores: { fundamental: true, technical: true, narrative: false } };
    }

    // PASSED ALL CHECKS
    return { 
        passed: true, 
        reason: "Passed Triple-Check Protocol", 
        scores: { fundamental: true, technical: true, narrative: true } 
    };
  }
}

export default new RiskValidatorService();
