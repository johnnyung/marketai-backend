// backend/src/services/realDataIntegrationService.ts
// IMPROVED: Add timeouts, error handling, and graceful fallbacks

import secEdgarService from './secEdgarService.js';
import redditService from './redditService.js';
import technicalIndicatorsService from './technicalIndicatorsService.js';

interface RealMarketData {
  insiderTrades: any[];
  socialSentiment: any[];
  technicalSignals: any[];
  summary: {
    totalInsiderTrades: number;
    topTrendingTickers: string[];
    technicallyStrongTickers: string[];
    timestamp: string;
  };
}

class RealDataIntegrationService {
  
  async getAllRealData(): Promise<RealMarketData> {
    console.log('\n🌐 === FETCHING REAL MARKET DATA ===\n');
    
    try {
      // Fetch with timeouts - don't let any single source block everything
      const [insiderTrades, socialSentiment] = await Promise.all([
        this.withTimeout(
          secEdgarService.getRecentInsiderTrades(30), // Reduced from 50 to 30
          15000, // 15 second timeout
          'SEC EDGAR'
        ),
        this.withTimeout(
          (async () => {
            const comprehensive = await redditService.getComprehensiveSentiment();
            return comprehensive.trending;
          })(),
          15000, // 15 second timeout
          'Reddit'
        )
      ]);
      
      // Get unique tickers from available data
      const allTickers = this.extractUniqueTickers(insiderTrades, socialSentiment);
      
      // Only fetch technical data for top 5 tickers to avoid rate limits
      const topTickers = allTickers.slice(0, 5); // Reduced from 10 to 5
      
      let technicalSignals: any[] = [];
      
      if (topTickers.length > 0) {
        console.log(`\n📊 Fetching technical indicators for: ${topTickers.join(', ')}\n`);
        
        // Fetch technical data with timeout
        technicalSignals = await this.withTimeout(
          this.fetchTechnicalDataSequentially(topTickers),
          30000, // 30 second timeout for all technical data
          'Technical Indicators'
        );
      }
      
      // Generate summary
      const summary = {
        totalInsiderTrades: insiderTrades.length,
        topTrendingTickers: socialSentiment.slice(0, 5).map(s => s.ticker),
        technicallyStrongTickers: technicalSignals
          .filter(t => t && t.overallSignal === 'bullish')
          .map(t => t.ticker),
        timestamp: new Date().toISOString()
      };
      
      console.log('\n✅ === REAL DATA FETCH COMPLETE ===');
      console.log(`   Insider Trades: ${insiderTrades.length}`);
      console.log(`   Social Mentions: ${socialSentiment.length} tickers`);
      console.log(`   Technical Signals: ${technicalSignals.length} tickers`);
      console.log(`   Top Trending: ${summary.topTrendingTickers.join(', ')}\n`);
      
      return {
        insiderTrades,
        socialSentiment,
        technicalSignals,
        summary
      };
      
    } catch (error: any) {
      console.error('❌ Error fetching real data:', error.message);
      
      // Return empty data rather than crashing
      return {
        insiderTrades: [],
        socialSentiment: [],
        technicalSignals: [],
        summary: {
          totalInsiderTrades: 0,
          topTrendingTickers: [],
          technicallyStrongTickers: [],
          timestamp: new Date().toISOString()
        }
      };
    }
  }
  
  // Fetch technical data one at a time to respect rate limits
  private async fetchTechnicalDataSequentially(tickers: string[]): Promise<any[]> {
    const results: any[] = [];
    
    for (const ticker of tickers) {
      try {
        const data = await technicalIndicatorsService.getTechnicalIndicators(ticker);
        if (data) results.push(data);
        
        // Wait 13 seconds between calls (Alpha Vantage free tier: 5 calls/minute)
        if (tickers.indexOf(ticker) < tickers.length - 1) {
          await this.sleep(13000);
        }
      } catch (error) {
        console.error(`⚠️ Skipping technical data for ${ticker}`);
        continue;
      }
    }
    
    return results;
  }
  
  async getRealDataForTicker(ticker: string): Promise<any> {
    console.log(`\n🔍 Fetching real data for ${ticker}...\n`);
    
    try {
      const [insiderTrades, technical] = await Promise.all([
        this.withTimeout(
          secEdgarService.getInsiderTradesForTicker(ticker),
          10000,
          'SEC EDGAR'
        ),
        this.withTimeout(
          technicalIndicatorsService.getTechnicalIndicators(ticker),
          10000,
          'Technical'
        )
      ]);
      
      // Check if ticker is trending on Reddit
      const comprehensive = await redditService.getComprehensiveSentiment();
      const socialMentions = comprehensive.trending;
      const socialData = socialMentions.find((s: any) => s.ticker === ticker);
      
      return {
        ticker,
        insiderTrades,
        technical,
        social: socialData || null,
        timestamp: new Date().toISOString()
      };
      
    } catch (error: any) {
      console.error(`❌ Error fetching data for ${ticker}:`, error.message);
      return null;
    }
  }
  
  private extractUniqueTickers(insiderTrades: any[], socialSentiment: any[]): string[] {
    const tickers = new Set<string>();
    
    // Add tickers from insider trades
    insiderTrades.forEach(trade => {
      if (trade.ticker) tickers.add(trade.ticker);
    });
    
    // Add tickers from social sentiment
    socialSentiment.forEach(mention => {
      if (mention.ticker) tickers.add(mention.ticker);
    });
    
    // Convert to array and filter
    return Array.from(tickers)
      .filter(ticker => ticker.length <= 5 && ticker.length >= 1)
      .sort((a, b) => {
        const aCount = insiderTrades.filter(t => t.ticker === a).length +
                      (socialSentiment.find(s => s.ticker === a)?.mentions || 0);
        const bCount = insiderTrades.filter(t => t.ticker === b).length +
                      (socialSentiment.find(s => s.ticker === b)?.mentions || 0);
        return bCount - aCount;
      })
      .slice(0, 20); // Top 20 instead of 30
  }
  
  // Wrapper to add timeout to any promise
  private async withTimeout<T>(
    promise: Promise<T>, 
    timeoutMs: number, 
    source: string
  ): Promise<T> {
    const timeoutPromise = new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${source} timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
    
    try {
      return await Promise.race([promise, timeoutPromise]);
    } catch (error: any) {
      console.error(`⚠️ ${source} failed:`, error.message);
      // Return empty array for failed sources
      return [] as any;
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new RealDataIntegrationService();
