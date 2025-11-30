import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

class StoryModeService {

  /**
   * Translates complex financial data into a simple 3-sentence story.
   */
  async generateStory(ticker: string, analysis: any): Promise<string> {
    try {
      const context = JSON.stringify({
        action: analysis.action,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
        engines: analysis.analysis
      });

      const prompt = `
        ACT AS: A friendly financial teacher explaining stocks to a 12-year-old.
        TICKER: ${ticker}
        DATA: ${context}

        TASK: Write a 3-sentence story explaining why we should Buy, Sell, or Watch this stock.
        
        RULES:
        1. Use simple analogies (e.g. "coiled spring", "on sale", "too hot").
        2. No jargon (No "RSI", "Gamma", "Beta").
        3. Sentences:
           - Sentence 1: What is happening? (The setup)
           - Sentence 2: Why does it matter? (The catalyst)
           - Sentence 3: What should we do? (The action)

        OUTPUT: Just the story string. No quotes.
      `;

      const message = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = message.content[0].type === 'text' ? message.content[0].text : '';
      return text.trim();

    } catch (e) {
      // Fallback if AI fails
      return `${ticker} looks interesting because our systems see ${analysis.reasoning}. It might be a good time to ${analysis.action.toLowerCase()}.`;
    }
  }
}

export default new StoryModeService();
