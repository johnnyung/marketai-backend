import governmentDataService from './governmentDataService.js';
import Anthropic from '@anthropic-ai/sdk';
import { extractJSON } from '../utils/aiUtils.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface PolicyImpact {
  bill_title: string;
  pass_probability: number;
  impact_score: number;
  beneficiaries: string[];
  victims: string[];
  reasoning: string;
}

class PolicySimulatorService {

  async simulatePendingLegislation(): Promise<PolicyImpact[]> {
    // console.log('      🏛️  Simulating Policy Impacts...');

    try {
        const legislation = await governmentDataService.getLegislation();
        if (!legislation || legislation.length === 0) return [];

        const pendingBills = legislation.slice(0, 5);
        const results: PolicyImpact[] = [];

        for (const bill of pendingBills) {
            const analysis = await this.analyzeBill(bill.title, bill.summary || "");
            if (analysis && analysis.pass_probability > 50 && analysis.impact_score > 70) {
                 results.push({
                     bill_title: bill.title,
                     ...analysis
                 });
            }
        }
        return results;
    } catch (e) {
        return [];
    }
  }

  private async analyzeBill(title: string, summary: string) {
      const prompt = `
        BILL: "${title}"
        SUMMARY: "${summary.substring(0, 500)}"

        TASK: Estimate impact on US Public Companies.
        OUTPUT JSON ONLY:
        {
            "pass_probability": 65,
            "impact_score": 85,
            "beneficiaries": ["LMT", "RTX"],
            "victims": [],
            "reasoning": "Increases defense spending..."
        }
      `;

      try {
          const msg = await anthropic.messages.create({
              model: 'claude-3-haiku-20240307',
              max_tokens: 500,
              messages: [{ role: 'user', content: prompt }]
          });
          const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
          return extractJSON(text);
      } catch (e) { return null; }
  }
}

export default new PolicySimulatorService();
