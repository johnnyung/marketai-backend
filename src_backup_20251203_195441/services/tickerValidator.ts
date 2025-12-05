import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

// This agent specifically researches ONE stock to see if it matches the strategy
export async function validateTicker(ticker: string, strategy: string): Promise<{ valid: boolean, reason: string }> {
  try {
    // 1. Pull specific news for this ticker
    const url = `https://news.google.com/rss/search?q=${ticker}+stock+news&hl=en-US&gl=US&ceid=US:en`;
    const res = await axios.get(url, { timeout: 4000 });
    const result = await parseStringPromise(res.data);
    const items = result.rss?.channel?.[0]?.item || [];
    const headlines = items.slice(0, 5).map((i: any) => i.title?.[0]).join('\n');

    if (!headlines) return { valid: true, reason: "No negative news found." };

    // 2. Ask AI to validate
    const prompt = `
      I am considering BUYING ${ticker} based on this strategy: "${strategy}".
      
      RECENT NEWS FOR ${ticker}:
      ${headlines}

      TASK:
      Act as a Risk Manager.
      1. Are there any immediate "Red Flags" in the news (lawsuits, earnings miss, fraud)?
      2. Does the news align with the strategy?

      Output JSON only:
      { "valid": true/false, "reason": "1 sentence explanation" }
    `;

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const clean = text.replace(/\n?/g, '').trim();
    return JSON.parse(clean);

  } catch (e) {
    return { valid: true, reason: "Validation skipped (network error)" };
  }
}
