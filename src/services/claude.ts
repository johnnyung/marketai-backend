import fetch from 'node-fetch';

const API_KEY = process.env.CLAUDE_API_KEY;
const API_URL = 'https://api.anthropic.com/v1/messages';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  system?: string;
  max_tokens?: number;
}

interface ChatResponse {
  content: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Send message to Claude API
 */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  if (!API_KEY) {
    throw new Error('CLAUDE_API_KEY not configured');
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: request.max_tokens || 1000,
      system: request.system || 'You are MarketAI, an intelligent investment research assistant.',
      messages: request.messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} ${error}`);
  }

  const data: any = await response.json();

  return {
    content: data.content[0].text,
    usage: {
      input_tokens: data.usage.input_tokens,
      output_tokens: data.usage.output_tokens,
    },
  };
}

/**
 * Summarize news article
 */
export async function summarizeNews(article: string): Promise<string> {
  const response = await sendChatMessage({
    messages: [
      {
        role: 'user',
        content: `Summarize this market news in 2-3 sentences focusing on investment implications:\n\n${article}`,
      },
    ],
    max_tokens: 200,
  });

  return response.content;
}

/**
 * Analyze trade decision
 */
export async function analyzeTrade(
  ticker: string,
  action: 'buy' | 'sell',
  reasoning: string,
  currentPrice: number
): Promise<string> {
  const response = await sendChatMessage({
    messages: [
      {
        role: 'user',
        content: `As a trading coach, review this trade decision:

Ticker: ${ticker}
Action: ${action.toUpperCase()}
Current Price: $${currentPrice}
Trader's Reasoning: ${reasoning}

Provide: 1) Is the reasoning sound? 2) What to watch for 3) Risk management tips

Keep it concise (3-4 sentences).`,
      },
    ],
    max_tokens: 300,
  });

  return response.content;
}

/**
 * Get AI trading advice for a position
 */
export async function getTradingAdvice(
  ticker: string,
  buyPrice: number,
  currentPrice: number,
  shares: number
): Promise<string> {
  const profitPercent = ((currentPrice - buyPrice) / buyPrice) * 100;
  const profitLoss = (currentPrice - buyPrice) * shares;

  const response = await sendChatMessage({
    messages: [
      {
        role: 'user',
        content: `Trading Coach Analysis:

Position: ${shares} shares of ${ticker}
Buy Price: $${buyPrice}
Current Price: $${currentPrice}
P&L: ${profitLoss >= 0 ? '+' : ''}$${profitLoss.toFixed(2)} (${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%)

What should the trader do? Consider profit-taking, stop-losses, or holding. Be specific and concise (3-4 sentences).`,
      },
    ],
    max_tokens: 250,
  });

  return response.content;
}

export const claudeService = {
  sendChatMessage,
  summarizeNews,
  analyzeTrade,
  getTradingAdvice,
};
