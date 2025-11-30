import Anthropic from '@anthropic-ai/sdk';
import { extractJSON } from '../utils/aiUtils.js';
import fmpService from './fmpService.js';
import newsApiService from './newsApiService.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface TribunalVerdict {
  ticker: string;
  bull_case: string;
  bull_score: number;
  bear_case: string;
  bear_score: number;
  final_verdict: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  judge_reasoning: string;
}

class TribunalService {

  async conductTrial(ticker: string): Promise<TribunalVerdict> {
    console.log(`      👨‍⚖️ The Tribunal is in session for ${ticker}...`);
    
    try {
        // 1. GATHER EVIDENCE (with fallbacks)
        const [profile, news, technicals] = await Promise.all([
            fmpService.getCompanyProfile(ticker),
            newsApiService.getTickerNews(ticker, undefined, 5),
            fmpService.getRSI(ticker)
        ]);

        // If data missing, return neutral verdict immediately
        if (!profile) {
             return this.getMistrial(ticker, "Insufficient Evidence (Profile Missing)");
        }

        const evidence = `
            TICKER: ${ticker} (${profile.companyName})
            PRICE: ${profile.price} (Beta: ${profile.beta})
            SECTOR: ${profile.sector}
            RSI: ${technicals || 50}
            NEWS: ${news.map((n: any) => n.title).join(' | ')}
        `;

        // 2. THE BULL AGENT
        const bullRes = await this.callAI(
            `ACT AS: The Bull Agent. EVIDENCE: ${evidence}. TASK: Argue for LONG. OUTPUT JSON: { "argument": "string", "score": 0-100 }`
        );

        // 3. THE BEAR AGENT
        const bearRes = await this.callAI(
            `ACT AS: The Bear Agent. EVIDENCE: ${evidence}. TASK: Argue for SHORT. OUTPUT JSON: { "argument": "string", "score": 0-100 }`
        );

        // 4. THE JUDGE
        const judgeRes = await this.callAI(
            `ACT AS: Impartial Judge. BULL (${bullRes.score}): ${bullRes.argument}. BEAR (${bearRes.score}): ${bearRes.argument}. 
             OUTPUT JSON: { "verdict": "BUY/SELL/HOLD", "confidence": 0-100, "reasoning": "string" }`
        );

        const verdict = judgeRes.verdict || 'HOLD';
        
        // Validate result
        const result = {
            ticker,
            bull_case: bullRes.argument || "No argument",
            bull_score: bullRes.score || 50,
            bear_case: bearRes.argument || "No argument",
            bear_score: bearRes.score || 50,
            final_verdict: verdict as any,
            confidence: judgeRes.confidence || 50,
            judge_reasoning: judgeRes.reasoning || "Decision pending."
        };

        console.log(`      👨‍⚖️ Verdict for ${ticker}: ${result.final_verdict} (${result.confidence}%)`);
        return result;

    } catch (e) {
        return this.getMistrial(ticker, "System Error during Trial");
    }
  }

  private getMistrial(ticker: string, reason: string): TribunalVerdict {
      return {
            ticker, bull_case: "", bull_score: 0, bear_case: "", bear_score: 0,
            final_verdict: 'HOLD', confidence: 0, judge_reasoning: `Mistrial: ${reason}`
        };
  }

  private async callAI(prompt: string) {
      try {
          const msg = await anthropic.messages.create({
              model: 'claude-3-haiku-20240307',
              max_tokens: 500,
              messages: [{ role: 'user', content: prompt }]
          });
          const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
          return extractJSON(text);
      } catch (e) { return { argument: "Error", score: 50, verdict: "HOLD", confidence: 0, reasoning: "Error" }; }
  }
}

export default new TribunalService();
