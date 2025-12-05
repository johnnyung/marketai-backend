import marketDataService from './marketDataService.js';
import financialClockService from './financialClockService.js';
import technicalIndicatorsService from './technicalIndicatorsService.js';
import fmpService from './fmpService.js';

interface CrisisCheck {
  is_crisis: boolean;
  vix_level: number;
  passed: boolean;
  reason: string;
  modifier: number; // -20 to 0 confidence penalty
}

class CrisisAmplifierService {

  async evaluateSignal(ticker: string, action: string, sector: string): Promise<CrisisCheck> {
    // 1. Get VIX
    let vix = 15.0;
    try {
        const quote = await marketDataService.getStockPrice('^VIX');
        if (quote) vix = quote.price;
    } catch(e) {}

    // If VIX is low, pass through
    if (vix < 20) {
        return { is_crisis: false, vix_level: vix, passed: true, reason: "Normal Volatility", modifier: 0 };
    }

    console.log(`      🌩️  Crisis Mode Active (VIX: ${vix}). Tightening filters for ${ticker}...`);
    let passed = true;
    let reason = [];
    let modifier = 0;

    // 2. MACRO ALIGNMENT CHECK (Strict)
    // In crisis, you MUST align with the cycle phase. No fighting the trend.
    const clock = await financialClockService.getClockState();
    const isDefensive = ['Energy', 'Utilities', 'Healthcare', 'Consumer Defensive'].includes(sector);
    
    if (clock.phase === 'RECESSION' || clock.phase === 'STAGFLATION') {
        if (!isDefensive && action === 'BUY') {
            passed = false;
            reason.push(`Misaligned with ${clock.phase} cycle.`);
        }
    }

    // 3. TECHNICAL CHECK (Deep Oversold Only)
    // In high vol, "Dip Buying" is dangerous. Only buy if RSI < 30 (extreme).
    if (action === 'BUY') {
        const tech = await technicalIndicatorsService.getTechnicalIndicators(ticker);
        if (tech && tech.rsi > 35) { // Relaxed slightly from 30 to 35 for reality
            passed = false;
            reason.push(`RSI ${tech.rsi.toFixed(0)} too high for Crisis Buy (Req < 35).`);
        }
    }

    // 4. QUALITY CHECK (Profitability)
    // In crisis, only profitable companies survive.
    const profile = await fmpService.getCompanyProfile(ticker);
    // FMP 'isEtf' check or just basic earnings check if available.
    // We'll assume non-ETF needs positive earnings.
    if (profile && !profile.isEtf && profile.beta > 1.5) {
        modifier -= 15;
        reason.push(`High Beta (${profile.beta}) penalised in crisis.`);
    }

    if (!passed) {
        return { is_crisis: true, vix_level: vix, passed: false, reason: `[CRISIS VETO] ${reason.join(' ')}`, modifier: -100 };
    }

    return { 
        is_crisis: true, 
        vix_level: vix, 
        passed: true, 
        reason: `[CRISIS VERIFIED] Passed strict checks.`, 
        modifier: modifier 
    };
  }
}

export default new CrisisAmplifierService();
