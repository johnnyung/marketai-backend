import fmpService from './fmpService.js';
import newsApiService from './newsApiService.js';
import governmentDataService from './governmentDataService.js';
import Anthropic from '@anthropic-ai/sdk';
import { extractJSON } from '../utils/aiUtils.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface CatalystResult {
  found: boolean;
  type: string; // 'EARNINGS', 'CONTRACT', 'REGULATION', 'INSIDER', 'MACRO', 'NONE'
  description: string;
  confidence: number;
}

class ReverseScannerService {

  // The "Why is this moving?" function
  async findCatalyst(ticker: string): Promise<CatalystResult> {
    // console.log(`      🕵️  Reverse Scanning ${ticker} for catalysts...`);

    try {
        // 1. Gather Data Specific to Ticker
        const [news, profile, gov, insider] = await Promise.all([
            newsApiService.searchCompanyNews(ticker, undefined, undefined, 5),
            fmpService.getCompanyProfile(ticker),
            governmentDataService.searchGovernmentData([ticker]),
            fmpService.getInsiderFeed() // We filter this list in memory for speed
        ]);

        // Filter insider for specific ticker
        const specificInsider = insider.filter((t: any) => t.symbol === ticker);

        // 2. Build Evidence Block
        const evidence = `
          PROFILE: ${profile?.companyName || ticker}, Sector: ${profile?.sector}
          NEWS HEADLINES:
          ${news.map((n: any) => `- ${n.title} (${n.publishedAt})`).join('\n')}
          
          GOVERNMENT/POLITICAL:
          ${gov.map((g: any) => `- ${g.title}`).join('\n')}
          
          INSIDER TRADING:
          ${specificInsider.map((i: any) => `- ${i.reportingName} ${i.transactionType} ${i.securitiesTransacted} shares`).join('\n')}
        `;

        // 3. AI Causal Analysis
        const prompt = `
          ACT AS: Financial Forensic Investigator.
          TARGET: ${ticker}
          EVIDENCE:
          ${evidence.substring(0, 5000)}

          TASK: Identify the PRIMARY CATALYST driving this stock right now.
          
          VALID CATALYSTS:
          - Earnings Beat/Miss
          - New Contract/Partnership
          - Regulatory Change/Law
          - Massive Insider Buy/Sell
          - Sector-wide Macro Shift (e.g. Oil price spike for Energy stock)

          OUTPUT STRICT JSON:
          {
            "found": true/false,
            "type": "CATEGORY (or 'NONE')",
            "description": "1 sentence explanation of the specific event.",
            "confidence": 0-100
          }
          
          CONSTRAINT: If the news is just "stock moved" or generic noise, found=false.
        `;

        const msg = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 300,
            messages: [{ role: 'user', content: prompt }]
        });

        const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
        const result = extractJSON(text);

        if (result && result.found && result.confidence > 60) {
            // console.log(`      ✅ Catalyst Found: ${result.type} - ${result.description}`);
            return result;
        }

        return { found: false, type: 'NONE', description: 'No clear catalyst found.', confidence: 0 };

    } catch (e) {
        return { found: false, type: 'ERROR', description: 'Scan failed.', confidence: 0 };
    }
  }
}

export default new ReverseScannerService();
