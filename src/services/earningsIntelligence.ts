// src/services/earningsIntelligence.ts
// PHASE 8B: Earnings intelligence - calendar, estimates, beat/miss patterns

import axios from 'axios';

interface EarningsData {
  source: string;
  type: 'earnings_calendar' | 'earnings_estimate' | 'earnings_surprise' | 'earnings_pattern';
  timestamp: Date;
  title: string;
  content: string;
  ticker: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  metadata: any;
}

class EarningsIntelligenceService {
  
  /**
   * Fetch all earnings intelligence
   */
  async fetchAll(): Promise<EarningsData[]> {
    console.log('📅 Fetching earnings intelligence...');
    
    const allData: EarningsData[] = [];
    
    try {
      // Fetch earnings calendar
      const calendar = await this.fetchEarningsCalendar();
      allData.push(...calendar);
      
      // Fetch analyst estimates
      const estimates = await this.fetchAnalystEstimates();
      allData.push(...estimates);
      
      // Fetch recent surprises
      const surprises = await this.fetchEarningsSurprises();
      allData.push(...surprises);
      
      // Fetch historical patterns
      const patterns = await this.fetchEarningsPatterns();
      allData.push(...patterns);
      
      console.log(`✅ Earnings intelligence: ${allData.length} items`);
      return allData;
      
    } catch (error: any) {
      console.error('❌ Earnings intelligence error:', error.message);
      return allData;
    }
  }

  /**
   * Fetch earnings calendar
   * Who reports when
   */
  async fetchEarningsCalendar(): Promise<EarningsData[]> {
    const data: EarningsData[] = [];
    
    try {
      // Mock earnings calendar (use Alpha Vantage EARNINGS_CALENDAR or FMP API)
      const mockCalendar = [
        {
          ticker: 'NVDA',
          company: 'NVIDIA',
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          time: 'After Market Close',
          estimate: 0.75,
          historicalBeats: 8,
          historicalMisses: 2
        },
        {
          ticker: 'AAPL',
          company: 'Apple',
          date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          time: 'After Market Close',
          estimate: 1.54,
          historicalBeats: 12,
          historicalMisses: 0
        },
        {
          ticker: 'TSLA',
          company: 'Tesla',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          time: 'After Market Close',
          estimate: 0.98,
          historicalBeats: 6,
          historicalMisses: 6
        },
        {
          ticker: 'MSFT',
          company: 'Microsoft',
          date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          time: 'After Market Close',
          estimate: 2.85,
          historicalBeats: 10,
          historicalMisses: 2
        }
      ];
      
      mockCalendar.forEach(earning => {
        const daysUntil = Math.ceil((earning.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const beatRate = (earning.historicalBeats / (earning.historicalBeats + earning.historicalMisses) * 100).toFixed(0);
        
        data.push({
          source: 'Earnings Calendar',
          type: 'earnings_calendar',
          timestamp: earning.date,
          title: `${earning.ticker} reports in ${daysUntil} days`,
          content: `${earning.company} earnings ${earning.time} on ${earning.date.toLocaleDateString()}. Estimate: $${earning.estimate} EPS. Historical: ${beatRate}% beat rate (${earning.historicalBeats} beats, ${earning.historicalMisses} misses). Watch for pre-earnings positioning.`,
          ticker: earning.ticker,
          sentiment: parseFloat(beatRate) > 70 ? 'bullish' : 'neutral',
          metadata: {
            company: earning.company,
            date: earning.date,
            time: earning.time,
            estimate: earning.estimate,
            daysUntil: daysUntil,
            historicalBeatRate: parseFloat(beatRate)
          }
        });
      });
      
      console.log(`✅ Earnings calendar: ${data.length} upcoming reports`);
      
    } catch (error: any) {
      console.warn('⚠️ Earnings calendar unavailable:', error.message);
    }
    
    return data;
  }

  /**
   * Fetch analyst estimates
   * Current consensus and revisions
   */
  async fetchAnalystEstimates(): Promise<EarningsData[]> {
    const data: EarningsData[] = [];
    
    try {
      // Mock analyst estimates
      const mockEstimates = [
        {
          ticker: 'NVDA',
          currentEstimate: 0.75,
          previousEstimate: 0.68,
          revision: '+10.3%',
          analystCount: 42,
          upgrades: 5,
          downgrades: 0
        },
        {
          ticker: 'AAPL',
          currentEstimate: 1.54,
          previousEstimate: 1.52,
          revision: '+1.3%',
          analystCount: 38,
          upgrades: 2,
          downgrades: 1
        }
      ];
      
      mockEstimates.forEach(est => {
        const sentiment = est.upgrades > est.downgrades ? 'bullish' : 'bearish';
        
        data.push({
          source: 'Analyst Estimates',
          type: 'earnings_estimate',
          timestamp: new Date(),
          title: `${est.ticker} estimate revised ${est.revision}`,
          content: `${est.ticker} consensus EPS estimate: $${est.currentEstimate} (revised from $${est.previousEstimate}, ${est.revision}). ${est.analystCount} analysts. Recent activity: ${est.upgrades} upgrades, ${est.downgrades} downgrades. Positive revisions often precede beats.`,
          ticker: est.ticker,
          sentiment: sentiment,
          metadata: {
            currentEstimate: est.currentEstimate,
            previousEstimate: est.previousEstimate,
            revision: est.revision,
            analystCount: est.analystCount,
            upgrades: est.upgrades,
            downgrades: est.downgrades
          }
        });
      });
      
      console.log(`✅ Analyst estimates: ${data.length} revisions`);
      
    } catch (error: any) {
      console.warn('⚠️ Analyst estimates unavailable:', error.message);
    }
    
    return data;
  }

  /**
   * Fetch recent earnings surprises
   * Beat/miss and market reaction
   */
  async fetchEarningsSurprises(): Promise<EarningsData[]> {
    const data: EarningsData[] = [];
    
    try {
      // Mock recent surprises
      const mockSurprises = [
        {
          ticker: 'GOOGL',
          reported: 1.89,
          estimated: 1.71,
          surprise: '+10.5%',
          priceMove: '+7.2%',
          daysAgo: 2
        },
        {
          ticker: 'META',
          reported: 5.16,
          estimated: 4.98,
          surprise: '+3.6%',
          priceMove: '+4.1%',
          daysAgo: 3
        },
        {
          ticker: 'AMZN',
          reported: 1.43,
          estimated: 1.56,
          surprise: '-8.3%',
          priceMove: '-5.8%',
          daysAgo: 5
        }
      ];
      
      mockSurprises.forEach(surprise => {
        const beat = surprise.surprise.startsWith('+');
        const sentiment = beat ? 'bullish' : 'bearish';
        
        data.push({
          source: 'Earnings Surprise',
          type: 'earnings_surprise',
          timestamp: new Date(Date.now() - surprise.daysAgo * 24 * 60 * 60 * 1000),
          title: `${surprise.ticker} ${beat ? 'beat' : 'missed'} by ${surprise.surprise}`,
          content: `${surprise.ticker} reported $${surprise.reported} EPS vs $${surprise.estimated} estimate (${surprise.surprise}). Stock moved ${surprise.priceMove}. Similar companies reporting soon should watch this reaction pattern.`,
          ticker: surprise.ticker,
          sentiment: sentiment,
          metadata: {
            reported: surprise.reported,
            estimated: surprise.estimated,
            surprise: surprise.surprise,
            priceMove: surprise.priceMove,
            daysAgo: surprise.daysAgo
          }
        });
      });
      
      console.log(`✅ Earnings surprises: ${data.length} recent reports`);
      
    } catch (error: any) {
      console.warn('⚠️ Earnings surprises unavailable:', error.message);
    }
    
    return data;
  }

  /**
   * Fetch historical earnings patterns
   * Companies that consistently beat/miss
   */
  async fetchEarningsPatterns(): Promise<EarningsData[]> {
    const data: EarningsData[] = [];
    
    try {
      // Mock patterns
      const mockPatterns = [
        {
          ticker: 'AAPL',
          pattern: 'Consistent Beater',
          last12Quarters: { beats: 12, meets: 0, misses: 0 },
          avgSurprise: '+8.2%',
          avgPriceMove: '+3.5%',
          reliability: 'Very High'
        },
        {
          ticker: 'NVDA',
          pattern: 'Big Beater',
          last12Quarters: { beats: 10, meets: 1, misses: 1 },
          avgSurprise: '+15.4%',
          avgPriceMove: '+9.2%',
          reliability: 'High'
        },
        {
          ticker: 'TSLA',
          pattern: 'Volatile',
          last12Quarters: { beats: 6, meets: 1, misses: 5 },
          avgSurprise: '+2.1%',
          avgPriceMove: '+12.8%',
          reliability: 'Low'
        }
      ];
      
      mockPatterns.forEach(pattern => {
        const total = pattern.last12Quarters.beats + pattern.last12Quarters.meets + pattern.last12Quarters.misses;
        const beatRate = (pattern.last12Quarters.beats / total * 100).toFixed(0);
        
        data.push({
          source: 'Earnings Pattern Analysis',
          type: 'earnings_pattern',
          timestamp: new Date(),
          title: `${pattern.ticker}: ${pattern.pattern} (${beatRate}% beat rate)`,
          content: `${pattern.ticker} historical pattern: ${pattern.pattern}. Last 12 quarters: ${pattern.last12Quarters.beats} beats, ${pattern.last12Quarters.meets} meets, ${pattern.last12Quarters.misses} misses (${beatRate}% beat rate). Average surprise: ${pattern.avgSurprise}, Average price move: ${pattern.avgPriceMove}. Reliability: ${pattern.reliability}.`,
          ticker: pattern.ticker,
          sentiment: parseFloat(beatRate) > 70 ? 'bullish' : 'neutral',
          metadata: {
            pattern: pattern.pattern,
            last12Quarters: pattern.last12Quarters,
            avgSurprise: pattern.avgSurprise,
            avgPriceMove: pattern.avgPriceMove,
            reliability: pattern.reliability,
            beatRate: parseFloat(beatRate)
          }
        });
      });
      
      console.log(`✅ Earnings patterns: ${data.length} analyzed`);
      
    } catch (error: any) {
      console.warn('⚠️ Earnings patterns unavailable:', error.message);
    }
    
    return data;
  }

  /**
   * Get earnings data for specific ticker
   */
  async getForTicker(ticker: string): Promise<EarningsData[]> {
    const allData = await this.fetchAll();
    return allData.filter(item => 
      item.ticker?.toUpperCase() === ticker.toUpperCase()
    );
  }
}

export default new EarningsIntelligenceService();
