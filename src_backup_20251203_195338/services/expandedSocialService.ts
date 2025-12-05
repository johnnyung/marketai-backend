// backend/src/services/expandedSocialService.ts
// Expanded Social Intelligence - StockTwits, Hacker News, Reddit (multiple subs)

import axios from 'axios';
import * as cheerio from 'cheerio';

interface SocialMention {
  ticker?: string;
  title: string;
  content: string;
  source: string;
  platform: string;
  sentiment: number;
  mentions: number;
  url: string;
  publishedDate: Date;
}

class ExpandedSocialService {
  
  /**
   * Get Hacker News top stories
   */
  async getHackerNewsStories(): Promise<SocialMention[]> {
    const mentions: SocialMention[] = [];
    
    try {
      // Hacker News API
      const topStoriesRes = await axios.get('https://hacker-news.firebaseio.com/v0/topstories.json', {
        timeout: 10000
      });
      
      const topStoryIds = topStoriesRes.data.slice(0, 20); // Top 20 stories
      
      for (const id of topStoryIds) {
        try {
          const storyRes = await axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
            timeout: 5000
          });
          
          const story = storyRes.data;
          if (story && story.title) {
            mentions.push({
              title: story.title,
              content: story.text || '',
              source: 'Hacker News',
              platform: 'hackernews',
              sentiment: 0,
              mentions: story.score || 0,
              url: story.url || `https://news.ycombinator.com/item?id=${id}`,
              publishedDate: new Date((story.time || Date.now() / 1000) * 1000)
            });
          }
        } catch (error) {
          // Skip individual story errors
        }
      }
      
      console.log(`  ✓ Hacker News: ${mentions.length} stories`);
    } catch (error) {
      console.error('  ✗ Hacker News failed:', error instanceof Error ? error.message : 'Unknown');
    }
    
    return mentions;
  }

  /**
   * Get StockTwits trending
   * Note: StockTwits API requires authentication for most endpoints
   * This is a placeholder - implement when API key is available
   */
  async getStockTwitsTrending(): Promise<SocialMention[]> {
    const mentions: SocialMention[] = [];
    
    try {
      // TODO: Implement StockTwits API integration
      // Requires API key: https://api.stocktwits.com/developers/docs
      
      console.log(`  ⓘ StockTwits: Distabled (API key not configured)`);
      return mentions;
    } catch (error) {
      console.error('  ✗ StockTwits failed:', error);
      return mentions;
    }
  }

  /**
   * Get Reddit posts from multiple investing subreddits
   */
  async getRedditInvestingSentiment(): Promise<SocialMention[]> {
    const mentions: SocialMention[] = [];
    
    const subreddits = [
      'investing',
      'stocks',
      'stockmarket',
      'cryptocurrency',
      'technology'
    ];
    
    for (const subreddit of subreddits) {
      try {
        const response = await axios.get(`https://www.reddit.com/r/${subreddit}/hot.json?limit=10`, {
          timeout: 10000,
          headers: {
            'User-Agent': 'MarketAI/1.0'
          }
        });
        
        if (response.data?.data?.children) {
          const posts = response.data.data.children;
          
          for (const post of posts) {
            const data = post.data;
            mentions.push({
              title: data.title || '',
              content: data.selftext || '',
              source: `r/${subreddit}`,
              platform: 'reddit',
              sentiment: data.ups - data.downs,
              mentions: data.ups || 0,
              url: `https://www.reddit.com${data.permalink}`,
              publishedDate: new Date((data.created_utc || Date.now() / 1000) * 1000)
            });
          }
          
          console.log(`  ✓ r/${subreddit}: ${posts.length} posts`);
        }
      } catch (error) {
        console.error(`  ✗ r/${subreddit} failed:`, error instanceof Error ? error.message : 'Unknown');
      }
    }
    
    return mentions;
  }

  /**
   * Calculate relevance for social posts
   */
  calculateRelevance(mention: SocialMention): number {
    let score = 30; // Base score for social (lower than news)
    
    const text = `${mention.title} ${mention.content}`.toLowerCase();
    
    // High-value keywords
    const keywords = [
      'ipo', 'merger', 'acquisition', 'earnings',
      'sec', 'investigation', 'lawsuit',
      'breakthrough', 'partnership', 'deal'
    ];
    
    for (const keyword of keywords) {
      if (text.includes(keyword)) score += 10;
    }
    
    // Platform bonuses
    if (mention.platform === 'hackernews' && mention.mentions > 100) {
      score += 20; // Highly upvoted HN stories are significant
    }
    
    if (mention.platform === 'reddit' && mention.mentions > 1000) {
      score += 15; // Viral Reddit posts
    }
    
    // Engagement bonus
    if (mention.mentions > 500) score += 10;
    else if (mention.mentions > 100) score += 5;
    
    // Recency
    const hoursOld = (Date.now() - mention.publishedDate.getTime()) / (1000 * 60 * 60);
    if (hoursOld < 6) score += 10;
    else if (hoursOld < 24) score += 5;
    
    return Math.min(100, score);
  }

  /**
   * Extract tickers from social text
   */
  extractTickers(text: string): string[] {
    const tickers = new Set<string>();
    
    // Common social media ticker patterns
    const patterns = [
      /\$([A-Z]{1,5})\b/g,  // $AAPL
      /\b([A-Z]{2,5})\s+(?:stock|shares|calls|puts)/gi,
    ];
    
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const ticker = match[1].toUpperCase();
        if (ticker && ticker.length >= 1 && ticker.length <= 5) {
          // Filter common false positives
          if (!['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN'].includes(ticker)) {
            tickers.add(ticker);
          }
        }
      }
    }
    
    return Array.from(tickers).slice(0, 3);
  }

  /**
   * Determine sentiment
   */
  determineSentiment(mention: SocialMention): 'bullish' | 'bearish' | 'neutral' {
    const text = `${mention.title} ${mention.content}`.toLowerCase();
    
    const bullishKeywords = [
      'bullish', 'moon', 'rocket', 'calls', 'buy',
      'breakout', 'rally', 'surge', 'positive'
    ];
    
    const bearishKeywords = [
      'bearish', 'crash', 'puts', 'sell', 'short',
      'decline', 'dump', 'negative', 'warning'
    ];
    
    let bullishCount = 0;
    let bearishCount = 0;
    
    for (const keyword of bullishKeywords) {
      if (text.includes(keyword)) bullishCount++;
    }
    
    for (const keyword of bearishKeywords) {
      if (text.includes(keyword)) bearishCount++;
    }
    
    // Also use vote sentiment if available
    if (mention.sentiment > 0) bullishCount++;
    if (mention.sentiment < 0) bearishCount++;
    
    if (bullishCount > bearishCount) return 'bullish';
    if (bearishCount > bullishCount) return 'bearish';
    return 'neutral';
  }
}

export default new ExpandedSocialService();
