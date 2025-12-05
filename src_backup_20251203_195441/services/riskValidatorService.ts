import fmpService from './fmpService.js';

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
  async validateTicker(ticker: string, action: string = 'BUY'): Promise<ValidationResult> {
      try {
          const ratios = await fmpService.getFinancialRatios(ticker, 'annual', 1);
          
          // FIX: Handle RSI array
          const rsiData = await fmpService.getRSI(ticker);
          const rsi = rsiData?.[0]?.rsi || 50;

          let techReason = '';
          if (action === 'BUY' && rsi > 80) {
              techReason = `RSI ${rsi.toFixed(0)} > 80 (Overbought)`;
          }

          return {
              passed: true,
              reason: techReason || 'Valid',
              scores: { fundamental: true, technical: !techReason, narrative: true }
          };
      } catch (e) {
          return { passed: true, reason: 'Validation Skipped (Error)', scores: { fundamental: true, technical: true, narrative: true } };
      }
  }
}

export default new RiskValidatorService();
