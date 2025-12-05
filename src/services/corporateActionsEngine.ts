import fmpService from './fmpService.js';

interface ActionSignal {
  ticker: string;
  action_score: number; // 0-100 impact score
  events: {
    dividends: boolean;
    splits: boolean;
    buybacks: boolean;
    guidance: 'RAISED' | 'LOWERED' | 'NEUTRAL' | 'NONE';
  };
  details: string[];
}

class CorporateActionsEngine {

    async analyze(ticker: string): Promise<ActionSignal> {
        try {
            // Fetch raw data (simulated or real via FMP)
            const profile = await fmpService.getCompanyProfile(ticker);
            
            const signal: ActionSignal = {
                ticker,
                action_score: 50,
                events: {
                    dividends: !!profile?.lastDiv,
                    splits: false,
                    buybacks: false,
                    guidance: 'NONE'
                },
                details: []
            };

            // Dividend Logic
            if (signal.events.dividends) {
                signal.action_score += 5;
                signal.details.push(`Pays Dividend: ${profile.lastDiv}`);
            }

            return signal;

        } catch (error) {
            console.error(`[CAE] Error analyzing ${ticker}:`, error);
            return {
                ticker,
                action_score: 50,
                events: { dividends: false, splits: false, buybacks: false, guidance: 'NONE' },
                details: ['Data Unavailable']
            };
        }
    }
}

export default new CorporateActionsEngine();
