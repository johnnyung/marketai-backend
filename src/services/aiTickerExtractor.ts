// backend/src/services/aiTickerExtractor.ts
// AI-powered ticker extraction and validation using Claude
// Standalone service - no local imports

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface RedditPost {
  title: string;
  selftext: string;
  url: string;
  score: number;
  num_comments: number;
  created_utc: number;
}

interface NewsArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string;
}

interface ValidatedTicker {
  ticker: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  reasoning: string;
  keyPoints: string[];
  relevanceScore: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  sourceType: 'reddit' | 'news';
  sourceTitle: string;
  sourceUrl: string;
  metadata: {
    redditScore?: number;
    commentCount?: number;
    newsSource?: string;
  };
}

class AITickerExtractor {
  
  /**
   * Extract validated tickers from Reddit posts
   */
  async extractFromReddit(posts: RedditPost[]): Promise<ValidatedTicker[]> {
    if (!posts || posts.length === 0) return [];
    
    console.log(`🧠 AI: Analyzing ${posts.length} Reddit posts for ticker intelligence...`);
    
    const validatedTickers: ValidatedTicker[] = [];
    const batchSize = 10;
    
    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize);
      const batchResults = await this.analyzeRedditBatch(batch);
      validatedTickers.push(...batchResults);
      
      console.log(`  ✓ Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(posts.length/batchSize)}`);
    }
    
    console.log(`✅ AI extracted ${validatedTickers.length} validated ticker mentions from Reddit`);
    return validatedTickers;
  }
  
  /**
   * Extract validated tickers from news articles
   */
  async extractFromNews(articles: NewsArticle[]): Promise<ValidatedTicker[]> {
    if (!articles || articles.length === 0) return [];
    
    console.log(`🧠 AI: Analyzing ${articles.length} news articles for ticker intelligence...`);
    
    const validatedTickers: ValidatedTicker[] = [];
    const batchSize = 10;
    
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);
      const batchResults = await this.analyzeNewsBatch(batch);
      validatedTickers.push(...batchResults);
      
      console.log(`  ✓ Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(articles.length/batchSize)}`);
    }
    
    console.log(`✅ AI extracted ${validatedTickers.length} validated ticker mentions from news`);
    return validatedTickers;
  }
  
  /**
   * Comprehensive extraction from both sources
   */
  async extractComprehensive(redditPosts: RedditPost[], newsArticles: NewsArticle[]): Promise<ValidatedTicker[]> {
    const redditResults = await this.extractFromReddit(redditPosts);
    const newsResults = await this.extractFromNews(newsArticles);
    
    return [...redditResults, ...newsResults];
  }
  
  /**
   * Analyze batch of Reddit posts with Claude AI
   */
  private async analyzeRedditBatch(posts: RedditPost[]): Promise<ValidatedTicker[]> {
    const postsText = posts.map((post, idx) => 
      `POST ${idx + 1}:
Title: ${post.title}
Content: ${post.selftext.substring(0, 500)}
Score: ${post.score}, Comments: ${post.num_comments}
URL: ${post.url}
---`
    ).join('\n\n');
    
    const prompt = `You are analyzing Reddit posts for legitimate stock ticker discussions.

CRITICAL RULES:
1. ONLY extract tickers that are ACTUALLY being discussed as investments/trades
2. Ignore common words that happen to be 3-5 letters (TO, THE, FOR, GAINS, CASH, etc.)
3. Validate that the ticker is mentioned in a trading/investment context
4. Assign relevance score 1-10 based on discussion quality
5. Provide reasoning for EACH ticker extracted

Reddit Posts:
${postsText}

Return ONLY valid JSON array (no markdown, no explanation):
[
  {
    "ticker": "TSLA",
    "sentiment": "bullish",
    "reasoning": "User discussing large call options position with earnings catalyst",
    "keyPoints": ["$50k position", "Earnings next week", "Cybertruck thesis"],
    "relevanceScore": 9,
    "confidenceLevel": "high",
    "sourceIndex": 0
  }
]

If no valid tickers found, return empty array: []`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const text = message.content[0].type === 'text' ? message.content[0].text : '[]';
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const results = JSON.parse(cleaned);
      
      return results.map((result: any) => ({
        ticker: result.ticker,
        sentiment: result.sentiment,
        reasoning: result.reasoning,
        keyPoints: result.keyPoints || [],
        relevanceScore: result.relevanceScore,
        confidenceLevel: result.confidenceLevel,
        sourceType: 'reddit' as const,
        sourceTitle: posts[result.sourceIndex]?.title || 'Reddit Post',
        sourceUrl: posts[result.sourceIndex]?.url || '',
        metadata: {
          redditScore: posts[result.sourceIndex]?.score || 0,
          commentCount: posts[result.sourceIndex]?.num_comments || 0
        }
      }));
      
    } catch (error: any) {
      console.error('  ✗ AI analysis error:', error.message);
      return [];
    }
  }
  
  /**
   * Analyze batch of news articles with Claude AI
   */
  private async analyzeNewsBatch(articles: NewsArticle[]): Promise<ValidatedTicker[]> {
    const articlesText = articles.map((article, idx) => 
      `ARTICLE ${idx + 1}:
Title: ${article.title}
Description: ${article.description}
Source: ${article.source.name}
URL: ${article.url}
---`
    ).join('\n\n');
    
    const prompt = `You are analyzing financial news articles for stock ticker discussions.

CRITICAL RULES:
1. Extract tickers mentioned in significant business/financial context
2. Ignore casual mentions or generic references
3. Assess sentiment based on article tone and content
4. Assign relevance score 1-10 based on news importance
5. Provide clear reasoning for each ticker

News Articles:
${articlesText}

Return ONLY valid JSON array (no markdown, no explanation):
[
  {
    "ticker": "NVDA",
    "sentiment": "bullish",
    "reasoning": "Company announces breakthrough AI chip with major performance gains",
    "keyPoints": ["New AI chip launch", "50% performance increase", "Strong demand signals"],
    "relevanceScore": 9,
    "confidenceLevel": "high",
    "sourceIndex": 0
  }
]

If no valid tickers found, return empty array: []`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const text = message.content[0].type === 'text' ? message.content[0].text : '[]';
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const results = JSON.parse(cleaned);
      
      return results.map((result: any) => ({
        ticker: result.ticker,
        sentiment: result.sentiment,
        reasoning: result.reasoning,
        keyPoints: result.keyPoints || [],
        relevanceScore: result.relevanceScore,
        confidenceLevel: result.confidenceLevel,
        sourceType: 'news' as const,
        sourceTitle: articles[result.sourceIndex]?.title || 'News Article',
        sourceUrl: articles[result.sourceIndex]?.url || '',
        metadata: {
          newsSource: articles[result.sourceIndex]?.source.name || 'Unknown'
        }
      }));
      
    } catch (error: any) {
      console.error('  ✗ AI analysis error:', error.message);
      return [];
    }
  }
}

export default new AITickerExtractor();
