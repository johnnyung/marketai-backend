import fmpService from './fmpService.js';
import Anthropic from '@anthropic-ai/sdk';
import { extractJSON } from '../utils/aiUtils.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface CEOProfile {
  ticker: string;
  confidence_score: number; // 0-100
  stress_level: 'LOW' | 'MEDIUM' | 'HIGH';
  tone: 'BULLISH' | 'CAUTIOUS' | 'DEFENSIVE' | 'EVASIVE';
  red_flags: string[];
  summary: string;
}

class CEOLanguageService {

  async analyze(ticker: string): Promise<CEOProfile | null> {
    try {
        // 1. Get Transcript
        // Uses the 'any' type cast to avoid TS issues if method signature varies slightly
        const transcript = await (fmpService as any).getEarningsTranscript?.(ticker);
        
        if (!transcript || !transcript.content) {
            return null;
        }

        // 2. Truncate for AI
        const contentSample = transcript.content.substring(0, 15000);

        // 3. AI Forensic Analysis
        const prompt = `
            ACT AS: FBI Behavioral Profiler.
            TASK: Analyze Earnings Call Transcript for HIDDEN SIGNALS.
            TICKER: ${ticker}
            TEXT: ${contentSample}

            DETECT: Confidence, Stress, Guidance shifting.

            OUTPUT STRICT JSON:
            {
                "confidence_score": 85,
                "stress_level": "LOW",
                "tone": "BULLISH",
                "red_flags": [],
                "summary": "CEO projects dominance."
            }
        `;

        const msg = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }]
        });

        const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
        const result = extractJSON(text);

        return {
            ticker,
            confidence_score: result.confidence_score || 50,
            stress_level: result.stress_level || 'MEDIUM',
            tone: result.tone || 'CAUTIOUS',
            red_flags: result.red_flags || [],
            summary: result.summary || 'Analysis inconclusive.'
        };

    } catch (e) {
        return null;
    }
  }
}

export default new CEOLanguageService();
