import fmpService from './fmpService.js';
import newsApiService from './newsApiService.js';
import technicalIndicatorsService from './technicalIndicatorsService.js';
import Anthropic from '@anthropic-ai/sdk';
import { extractJSON } from '../utils/aiUtils.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface AgentVerdict {
  agent: 'MOMENTUM' | 'VALUE' | 'CATALYST';
  score: number; // 0-100
  verdict: 'BULL' | 'BEAR' | 'NEUTRAL';
  reasoning: string;
}

interface ConsensusReport {
  ticker: string;
  final_score: number; // Weighted Average
  consensus: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  agreement_level: 'UNANIMOUS' | 'MAJORITY' | 'CONFLICTED';
  agents: {
    momentum: AgentVerdict;
    value: AgentVerdict;
    catalyst: AgentVerdict;
  };
  summary: string;
}

class MultiAgentValidationService {

  async validate(ticker: string): Promise<ConsensusReport> {
    // console.log(`      🤖 Multi-Agent: Convening Council for ${ticker}...`);

    try {
        // 1. Gather Evidence for each Specialist
        const [profile, keyMetrics, technicals, news] = await Promise.all([
            fmpService.getCompanyProfile(ticker),
            fmpService.getCompleteFundamentals(ticker), // Includes ratios
            technicalIndicatorsService.getTechnicalIndicators(ticker),
            newsApiService.getTickerNews(ticker, 5)
        ]);

        // Prepare Data Packets
        const momentumData = `
            Price: ${profile?.price}
            RSI: ${technicals?.rsi}
            SMA50: ${technicals?.movingAverages.ma50}
            SMA200: ${technicals?.movingAverages.ma200}
            Signal: ${technicals?.overallSignal}
            Volatility: ${technicals?.volatility}
        `;

        const valueData = `
            P/E: ${keyMetrics?.ratios[0]?.peRatioTTM || 'N/A'}
            P/B: ${keyMetrics?.ratios[0]?.priceToBookRatioTTM || 'N/A'}
            Debt/Equity: ${keyMetrics?.ratios[0]?.debtEquityRatioTTM || 'N/A'}
            FCF Growth: ${keyMetrics?.cashFlow[0]?.freeCashFlow || 'N/A'}
            Sector: ${profile?.sector}
        `;

        const catalystData = `
            Headlines:
            ${news.map((n: any) => `- ${n.title}`).join('\n')}
        `;

        // 2. The Council Session (Single Prompt for Efficiency, simulating 3 personas)
        const prompt = `
            TARGET: ${ticker}

            ACT AS THREE INDEPENDENT ANALYSTS. DO NOT AGREE WITH EACH OTHER. USE YOUR SPECIFIC DATA ONLY.

            --- AGENT 1: MOMENTUM TRADER ---
            DATA: ${momentumData.replace(/\n/g, ', ')}
            MANDATE: Focus ONLY on trend, volume, and RSI. Ignore valuation.
            OUTPUT: Score (0-100), Verdict (BULL/BEAR/NEUTRAL), 1 sentence reasoning.

            --- AGENT 2: VALUE INVESTOR ---
            DATA: ${valueData.replace(/\n/g, ', ')}
            MANDATE: Focus ONLY on balance sheet, cash flow, and valuation. Ignore chart.
            OUTPUT: Score (0-100), Verdict (BULL/BEAR/NEUTRAL), 1 sentence reasoning.

            --- AGENT 3: CATALYST HUNTER ---
            DATA: ${catalystData.replace(/\n/g, ' | ')}
            MANDATE: Focus ONLY on news, events, and narrative. Ignore price/value.
            OUTPUT: Score (0-100), Verdict (BULL/BEAR/NEUTRAL), 1 sentence reasoning.

            OUTPUT STRICT JSON:
            {
                "momentum": { "score": 85, "verdict": "BULL", "reasoning": "..." },
                "value": { "score": 40, "verdict": "BEAR", "reasoning": "..." },
                "catalyst": { "score": 75, "verdict": "BULL", "reasoning": "..." }
            }
        `;

        const msg = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 800,
            messages: [{ role: 'user', content: prompt }]
        });

        const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
        const result = extractJSON(text);

        // 3. Synthesize Consensus
        const mom = result.momentum || { score: 50, verdict: 'NEUTRAL', reasoning: 'Data Missing' };
        const val = result.value || { score: 50, verdict: 'NEUTRAL', reasoning: 'Data Missing' };
        const cat = result.catalyst || { score: 50, verdict: 'NEUTRAL', reasoning: 'Data Missing' };

        const avgScore = (mom.score + val.score + cat.score) / 3;
        
        // Determine Agreement Level
        const bulls = [mom.verdict, val.verdict, cat.verdict].filter(v => v === 'BULL').length;
        const bears = [mom.verdict, val.verdict, cat.verdict].filter(v => v === 'BEAR').length;
        
        let agreement: ConsensusReport['agreement_level'] = 'CONFLICTED';
        if (bulls === 3 || bears === 3) agreement = 'UNANIMOUS';
        else if (bulls === 2 || bears === 2) agreement = 'MAJORITY';

        let consensus: ConsensusReport['consensus'] = 'HOLD';
        if (avgScore > 80) consensus = 'STRONG_BUY';
        else if (avgScore > 60) consensus = 'BUY';
        else if (avgScore < 20) consensus = 'STRONG_SELL';
        else if (avgScore < 40) consensus = 'SELL';

        const summary = `MOMENTUM says ${mom.verdict} (${mom.score}), VALUE says ${val.verdict} (${val.score}), CATALYST says ${cat.verdict} (${cat.score}). Consensus: ${consensus}.`;

        return {
            ticker,
            final_score: Math.round(avgScore),
            consensus,
            agreement_level: agreement,
            agents: {
                momentum: { agent: 'MOMENTUM', ...mom },
                value: { agent: 'VALUE', ...val },
                catalyst: { agent: 'CATALYST', ...cat }
            },
            summary
        };

    } catch (e: any) {
        console.error("Multi-Agent Error:", e.message);
        return {
            ticker, final_score: 50, consensus: 'HOLD', agreement_level: 'CONFLICTED', summary: "Agents Offline",
            agents: {
                momentum: { agent: 'MOMENTUM', score: 0, verdict: 'NEUTRAL', reasoning: 'Error' },
                value: { agent: 'VALUE', score: 0, verdict: 'NEUTRAL', reasoning: 'Error' },
                catalyst: { agent: 'CATALYST', score: 0, verdict: 'NEUTRAL', reasoning: 'Error' }
            }
        };
    }
  }
}

export default new MultiAgentValidationService();
