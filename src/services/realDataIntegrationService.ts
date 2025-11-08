// backend/src/services/realDataIntegrationService.ts
// Combines all real data sources: SEC EDGAR + Reddit + Technical Indicators

import secEdgarService from './secEdgarService';
import redditService from './redditService';
import technicalIndicatorsService from './technicalIndicatorsService';

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
      // Fetch all data sources in parallel
      const [insiderTrades, socialSentiment] = await Promise.all([
        secEdgarService.getRecentInsiderTrades(50),
        redditService.getWallStreetBetsSentiment()
      ]);
      
      // Get unique tickers from all sources
      const allTickers = this.extractUniqueTickers(insiderTrades, socialSentiment);
      
      // Fetch technical indicators for top tickers (limited by rate limits)
      const topTickers = allTickers.slice(0, 10); // Top 10 to avoid rate limits
      console.log(`\n📊 Fetching technical indicators for: ${topTickers.join(', ')}\n`);
      
      const technicalSignals = await technicalIndicatorsService.getBatchTechnicalIndicators(topTickers);
      
      // Generate summary
      const summary = {
        totalInsiderTrades: insiderTrades.length,
        topTrendingTickers: socialSentiment.slice(0, 5).map(s => s.ticker),
        technicallyStrongTickers: technicalSignals
          .filter(t => t.overallSignal === 'bullish')
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
      
    } catch (error) {
      console.error('❌ Error fetching real data:', error);
      throw error;
    }
  }
  
  async getRealDataForTicker(ticker: string): Promise<any> {
    console.log(`\n🔍 Fetching real data for ${ticker}...\n`);
    
    try {
      const [insiderTrades, technical] = await Promise.all([
        secEdgarService.getInsiderTradesForTicker(ticker),
        technicalIndicatorsService.getTechnicalIndicators(ticker)
      ]);
      
      // Check if ticker is trending on Reddit
      const socialMentions = await redditService.getWallStreetBetsSentiment();
      const socialData = socialMentions.find(s => s.ticker === ticker);
      
      return {
        ticker,
        insiderTrades,
        technical,
        social: socialData || null,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ Error fetching data for ${ticker}:`, error);
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
    
    // Convert to array and filter common tickers
    return Array.from(tickers)
      .filter(ticker => ticker.length <= 5 && ticker.length >= 1)
      .sort((a, b) => {
        // Sort by relevance (how many sources mention it)
        const aCount = insiderTrades.filter(t => t.ticker === a).length +
                      (socialSentiment.find(s => s.ticker === a)?.mentions || 0);
        const bCount = insiderTrades.filter(t => t.ticker === b).length +
                      (socialSentiment.find(s => s.ticker === b)?.mentions || 0);
        return bCount - aCount;
      })
      .slice(0, 30); // Top 30 tickers
  }
}

export default new RealDataIntegrationService();
