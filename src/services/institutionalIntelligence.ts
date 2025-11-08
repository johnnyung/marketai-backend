// src/services/institutionalIntelligence.ts
// PHASE 7A: Track hedge funds, 13F filings, dark pool prints, institutional movements

import axios from 'axios';

interface InstitutionalData {
  source: string;
  type: 'institutional_trade' | '13f_filing' | 'whale_trade' | 'short_interest';
  timestamp: Date;
  title: string;
  content: string;
  ticker?: string;
  institution?: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  metadata: any;
}

class InstitutionalIntelligenceService {
  
  /**
   * Fetch all institutional intelligence
   */
  async fetchAll(): Promise<InstitutionalData[]> {
    console.log('🏦 Fetching institutional intelligence...');
    
    const allData: InstitutionalData[] = [];
    
    try {
      // Fetch 13F filings
      const filings = await this.fetch13FFilings();
      allData.push(...filings);
      
      // Fetch dark pool / whale trades
      const whaleTrades = await this.fetchWhaleTrades();
      allData.push(...whaleTrades);
      
      // Fetch short interest changes
      const shortInterest = await this.fetchShortInterest();
      allData.push(...shortInterest);
      
      console.log(`✅ Institutional intelligence: ${allData.length} items`);
      return allData;
      
    } catch (error: any) {
      console.error('❌ Institutional intelligence error:', error.message);
      return allData;
    }
  }

  /**
   * Fetch 13F filings (hedge fund holdings)
   * These are quarterly reports of institutional holdings
   */
  async fetch13FFilings(): Promise<InstitutionalData[]> {
    const data: InstitutionalData[] = [];
    
    try {
      // SEC EDGAR 13F filings
      // Note: This is a simplified implementation
      // In production, you'd parse actual SEC XML files or use a paid API
      
      // Mock recent 13F filings (replace with real API)
      const mock13FData = [
        {
          institution: 'Berkshire Hathaway (Warren Buffett)',
          ticker: 'AAPL',
          action: 'INCREASED',
          shares: 915_560_382,
          value: 174_300_000_000,
          change: '+5.2%',
          filing_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
        },
        {
          institution: 'Pershing Square (Bill Ackman)',
          ticker: 'GOOGL',
          action: 'NEW POSITION',
          shares: 5_500_000,
          value: 825_000_000,
          change: 'NEW',
          filing_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
        },
        {
          institution: 'Bridgewater Associates (Ray Dalio)',
          ticker: 'SPY',
          action: 'INCREASED',
          shares: 12_000_000,
          value: 5_400_000_000,
          change: '+15%',
          filing_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
        },
        {
          institution: 'ARK Invest (Cathie Wood)',
          ticker: 'TSLA',
          action: 'DECREASED',
          shares: 2_100_000,
          value: 525_000_000,
          change: '-8%',
          filing_date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)
        }
      ];
      
      mock13FData.forEach(filing => {
        data.push({
          source: '13F Filing (SEC)',
          type: '13f_filing',
          timestamp: filing.filing_date,
          title: `${filing.institution} ${filing.action} position in ${filing.ticker}`,
          content: `${filing.institution} filed 13F showing ${filing.action.toLowerCase()} position in ${filing.ticker}. Now holds ${filing.shares.toLocaleString()} shares valued at $${(filing.value / 1_000_000).toFixed(0)}M (${filing.change}).`,
          ticker: filing.ticker,
          institution: filing.institution,
          sentiment: filing.action === 'INCREASED' || filing.action === 'NEW POSITION' ? 'bullish' : 'bearish',
          metadata: {
            shares: filing.shares,
            value: filing.value,
            change: filing.change,
            action: filing.action
          }
        });
      });
      
      console.log(`✅ 13F filings: ${data.length} filings`);
      
    } catch (error: any) {
      console.warn('⚠️ 13F filings unavailable:', error.message);
    }
    
    return data;
  }

  /**
   * Fetch dark pool prints and whale trades
   * Large institutional trades that happen off-exchange
   */
  async fetchWhaleTrades(): Promise<InstitutionalData[]> {
    const data: InstitutionalData[] = [];
    
    try {
      // Mock whale trades (in production, use paid dark pool data API)
      const mockWhaleTrades = [
        {
          ticker: 'NVDA',
          volume: 2_500_000,
          value: 1_237_500_000,
          price: 495,
          side: 'BUY',
          time: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
          ticker: 'MSFT',
          volume: 1_800_000,
          value: 756_000_000,
          price: 420,
          side: 'BUY',
          time: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
        },
        {
          ticker: 'TSLA',
          volume: 3_200_000,
          value: 800_000_000,
          price: 250,
          side: 'SELL',
          time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
        }
      ];
      
      mockWhaleTrades.forEach(trade => {
        data.push({
          source: 'Dark Pool / Whale Trade',
          type: 'whale_trade',
          timestamp: trade.time,
          title: `Large ${trade.side} detected: ${trade.ticker}`,
          content: `Unusual ${trade.side.toLowerCase()} activity: ${trade.volume.toLocaleString()} shares of ${trade.ticker} at $${trade.price} (total value: $${(trade.value / 1_000_000).toFixed(0)}M). This represents significant institutional positioning.`,
          ticker: trade.ticker,
          institution: 'Unknown Institution',
          sentiment: trade.side === 'BUY' ? 'bullish' : 'bearish',
          metadata: {
            volume: trade.volume,
            value: trade.value,
            price: trade.price,
            side: trade.side
          }
        });
      });
      
      console.log(`✅ Whale trades: ${data.length} trades`);
      
    } catch (error: any) {
      console.warn('⚠️ Whale trades unavailable:', error.message);
    }
    
    return data;
  }

  /**
   * Fetch short interest changes
   * High short interest can indicate squeeze opportunities
   */
  async fetchShortInterest(): Promise<InstitutionalData[]> {
    const data: InstitutionalData[] = [];
    
    try {
      // Mock short interest data (use FINRA or paid API in production)
      const mockShortData = [
        {
          ticker: 'GME',
          shortInterest: 15.2,
          change: -5.3,
          daysTocover: 3.2
        },
        {
          ticker: 'AMC',
          shortInterest: 12.8,
          change: +2.1,
          daysTocover: 2.8
        },
        {
          ticker: 'TSLA',
          shortInterest: 3.5,
          change: +0.8,
          daysTocover: 1.2
        }
      ];
      
      mockShortData.forEach(short => {
        const sentiment = short.change > 0 ? 'bearish' : 'bullish';
        const direction = short.change > 0 ? 'increased' : 'decreased';
        
        data.push({
          source: 'Short Interest Report',
          type: 'short_interest',
          timestamp: new Date(),
          title: `${short.ticker} short interest ${direction}`,
          content: `Short interest in ${short.ticker} ${direction} to ${short.shortInterest}% (${short.change > 0 ? '+' : ''}${short.change}%). Days to cover: ${short.daysTocover}. ${short.shortInterest > 10 ? 'High short interest may indicate squeeze potential.' : ''}`,
          ticker: short.ticker,
          sentiment: sentiment,
          metadata: {
            shortInterest: short.shortInterest,
            change: short.change,
            daysTocover: short.daysTocover
          }
        });
      });
      
      console.log(`✅ Short interest: ${data.length} reports`);
      
    } catch (error: any) {
      console.warn('⚠️ Short interest unavailable:', error.message);
    }
    
    return data;
  }

  /**
   * Get institutional data for specific ticker
   */
  async getForTicker(ticker: string): Promise<InstitutionalData[]> {
    const allData = await this.fetchAll();
    return allData.filter(item => 
      item.ticker?.toUpperCase() === ticker.toUpperCase()
    );
  }
}

export default new InstitutionalIntelligenceService();
