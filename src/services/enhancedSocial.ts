// src/services/enhancedSocial.ts
// PHASE 8D: Enhanced social - Twitter/X, StockTwits, Discord beyond just Reddit

import axios from 'axios';

interface SocialData {
  source: string;
  type: 'social';
  timestamp: Date;
  title: string;
  content: string;
  ticker?: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  metadata: any;
}

class EnhancedSocialService {
  
  async fetchAll(): Promise<SocialData[]> {
    console.log('📱 Fetching enhanced social intelligence...');
    
    const allData: SocialData[] = [];
    
    try {
      // Twitter/X (if API key available)
      if (process.env.TWITTER_BEARER_TOKEN) {
        const twitter = await this.fetchTwitter();
        allData.push(...twitter);
      }
      
      // StockTwits
      const stocktwits = await this.fetchStockTwits();
      allData.push(...stocktwits);
      
      // Discord (simulated - requires bot integration)
      const discord = await this.fetchDiscord();
      allData.push(...discord);
      
      console.log(`✅ Enhanced social: ${allData.length} items`);
      return allData;
      
    } catch (error: any) {
      console.error('❌ Enhanced social error:', error.message);
      return allData;
    }
  }

  private async fetchTwitter(): Promise<SocialData[]> {
    const data: SocialData[] = [];
    
    try {
      // Mock Twitter data (use Twitter API v2 in production)
      const mockTweets = [
        {
          author: '@elonmusk',
          text: 'Tesla production hitting new records',
          ticker: 'TSLA',
          likes: 50000,
          retweets: 8000,
          sentiment: 'bullish'
        },
        {
          author: '@CathieDWood',
          text: 'AI revolution accelerating faster than expected',
          ticker: 'NVDA',
          likes: 12000,
          retweets: 3000,
          sentiment: 'bullish'
        },
        {
          author: '@FinancialInfluencer',
          text: 'Fed may need to raise rates again if inflation persists',
          ticker: 'SPY',
          likes: 5000,
          retweets: 1200,
          sentiment: 'bearish'
        }
      ];
      
      mockTweets.forEach(tweet => {
        data.push({
          source: 'Twitter/X',
          type: 'social',
          timestamp: new Date(),
          title: `${tweet.author}: ${tweet.text.substring(0, 50)}...`,
          content: `${tweet.author} tweeted: "${tweet.text}". Engagement: ${tweet.likes.toLocaleString()} likes, ${tweet.retweets.toLocaleString()} retweets. High engagement from influential accounts moves markets.`,
          ticker: tweet.ticker,
          sentiment: tweet.sentiment as any,
          metadata: {
            author: tweet.author,
            likes: tweet.likes,
            retweets: tweet.retweets,
            platform: 'twitter'
          }
        });
      });
      
      console.log(`✅ Twitter: ${data.length} tweets`);
    } catch (error: any) {
      console.warn('⚠️ Twitter unavailable:', error.message);
    }
    
    return data;
  }

  private async fetchStockTwits(): Promise<SocialData[]> {
    const data: SocialData[] = [];
    
    try {
      // Mock StockTwits data (use StockTwits API)
      const mockTwits = [
        {
          ticker: 'AAPL',
          messageCount: 5000,
          bullishPercent: 72,
          bearishPercent: 28,
          trending: true
        },
        {
          ticker: 'NVDA',
          messageCount: 8500,
          bullishPercent: 85,
          bearishPercent: 15,
          trending: true
        },
        {
          ticker: 'TSLA',
          messageCount: 12000,
          bullishPercent: 55,
          bearishPercent: 45,
          trending: true
        }
      ];
      
      mockTwits.forEach(twit => {
        const sentiment = twit.bullishPercent > 60 ? 'bullish' : twit.bullishPercent < 40 ? 'bearish' : 'neutral';
        
        data.push({
          source: 'StockTwits',
          type: 'social',
          timestamp: new Date(),
          title: `${twit.ticker}: ${twit.bullishPercent}% bullish (${twit.messageCount.toLocaleString()} messages)`,
          content: `${twit.ticker} StockTwits sentiment: ${twit.bullishPercent}% bullish, ${twit.bearishPercent}% bearish. Message volume: ${twit.messageCount.toLocaleString()}. ${twit.trending ? 'TRENDING' : 'Normal activity'}. Extreme sentiment (>80% or <20%) often signals reversal.`,
          ticker: twit.ticker,
          sentiment: sentiment,
          metadata: {
            messageCount: twit.messageCount,
            bullishPercent: twit.bullishPercent,
            bearishPercent: twit.bearishPercent,
            trending: twit.trending,
            platform: 'stocktwits'
          }
        });
      });
      
      console.log(`✅ StockTwits: ${data.length} tickers`);
    } catch (error: any) {
      console.warn('⚠️ StockTwits unavailable:', error.message);
    }
    
    return data;
  }

  private async fetchDiscord(): Promise<SocialData[]> {
    const data: SocialData[] = [];
    
    try {
      // Mock Discord data (requires Discord bot integration)
      const mockDiscord = [
        {
          server: 'WallStreetBets',
          topic: 'NVDA calls printing',
          ticker: 'NVDA',
          mentions: 250,
          sentiment: 'bullish'
        },
        {
          server: 'Day Trading',
          topic: 'SPY breakout setup',
          ticker: 'SPY',
          mentions: 180,
          sentiment: 'bullish'
        },
        {
          server: 'Crypto Traders',
          topic: 'BTC correlation with MSTR',
          ticker: 'MSTR',
          mentions: 95,
          sentiment: 'bullish'
        }
      ];
      
      mockDiscord.forEach(disc => {
        data.push({
          source: 'Discord Communities',
          type: 'social',
          timestamp: new Date(),
          title: `${disc.server}: ${disc.topic}`,
          content: `Discord server "${disc.server}" discussing: ${disc.topic}. ${disc.ticker} mentioned ${disc.mentions} times. Sentiment: ${disc.sentiment}. Discord communities provide early signals before mainstream adoption.`,
          ticker: disc.ticker,
          sentiment: disc.sentiment as any,
          metadata: {
            server: disc.server,
            mentions: disc.mentions,
            platform: 'discord'
          }
        });
      });
      
      console.log(`✅ Discord: ${data.length} discussions`);
    } catch (error: any) {
      console.warn('⚠️ Discord unavailable:', error.message);
    }
    
    return data;
  }

  async getForTicker(ticker: string): Promise<SocialData[]> {
    const allData = await this.fetchAll();
    return allData.filter(item => 
      item.ticker?.toUpperCase() === ticker.toUpperCase()
    );
  }
}

export default new EnhancedSocialService();
