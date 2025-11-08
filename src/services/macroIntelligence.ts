// src/services/macroIntelligence.ts
// PHASE 8C: Macro intelligence - Fed speeches, yields, dollar, commodities

import axios from 'axios';

interface MacroData {
  source: string;
  type: 'fed_speech' | 'yield_signal' | 'dollar_strength' | 'commodity_signal' | 'global_market';
  timestamp: Date;
  title: string;
  content: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  metadata: any;
}

class MacroIntelligenceService {
  
  async fetchAll(): Promise<MacroData[]> {
    console.log('🌍 Fetching macro intelligence...');
    
    const allData: MacroData[] = [];
    
    try {
      const fed = await this.fetchFedSignals();
      allData.push(...fed);
      
      const yields = await this.fetchYieldSignals();
      allData.push(...yields);
      
      const dollar = await this.fetchDollarStrength();
      allData.push(...dollar);
      
      const commodities = await this.fetchCommoditySignals();
      allData.push(...commodities);
      
      const global = await this.fetchGlobalMarkets();
      allData.push(...global);
      
      console.log(`✅ Macro intelligence: ${allData.length} items`);
      return allData;
      
    } catch (error: any) {
      console.error('❌ Macro intelligence error:', error.message);
      return allData;
    }
  }

  private async fetchFedSignals(): Promise<MacroData[]> {
    const data: MacroData[] = [];
    
    try {
      const mockFed = [
        {
          speaker: 'Jerome Powell',
          title: 'FOMC Press Conference',
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          tone: 'Hawkish',
          keyQuote: 'We will do what it takes to bring inflation down',
          rateExpectation: 'Hold rates higher for longer',
          marketImpact: 'Negative for growth stocks, positive for value'
        },
        {
          speaker: 'Fed Governor',
          title: 'Economic Outlook Speech',
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          tone: 'Dovish',
          keyQuote: 'Seeing signs of cooling inflation',
          rateExpectation: 'Possible rate cuts in H2 2025',
          marketImpact: 'Positive for equities, especially tech'
        }
      ];
      
      mockFed.forEach(fed => {
        const sentiment = fed.tone === 'Dovish' ? 'bullish' : 'bearish';
        
        data.push({
          source: 'Federal Reserve',
          type: 'fed_speech',
          timestamp: fed.date,
          title: `${fed.speaker}: ${fed.tone} tone`,
          content: `${fed.speaker} (${fed.title}): ${fed.keyQuote}. Tone: ${fed.tone}. Rate expectation: ${fed.rateExpectation}. Market impact: ${fed.marketImpact}. Fed communications significantly impact risk assets.`,
          sentiment: sentiment,
          metadata: {
            speaker: fed.speaker,
            tone: fed.tone,
            rateExpectation: fed.rateExpectation,
            marketImpact: fed.marketImpact
          }
        });
      });
      
      console.log(`✅ Fed signals: ${data.length} communications`);
    } catch (error: any) {
      console.warn('⚠️ Fed signals unavailable:', error.message);
    }
    
    return data;
  }

  private async fetchYieldSignals(): Promise<MacroData[]> {
    const data: MacroData[] = [];
    
    try {
      const mockYields = [
        {
          metric: '10Y Treasury Yield',
          current: 4.45,
          change: +0.15,
          trend: 'Rising',
          interpretation: 'Rising yields pressure growth stocks, favor value/financials'
        },
        {
          metric: '2Y-10Y Spread',
          current: 0.35,
          change: +0.05,
          trend: 'Steepening',
          interpretation: 'Steepening curve signals economic growth expectations'
        }
      ];
      
      mockYields.forEach(yield_sig => {
        const sentiment = yield_sig.trend === 'Rising' ? 'bearish' : 'bullish';
        
        data.push({
          source: 'Treasury Yields',
          type: 'yield_signal',
          timestamp: new Date(),
          title: `${yield_sig.metric}: ${yield_sig.current}% (${yield_sig.change > 0 ? '+' : ''}${yield_sig.change}%)`,
          content: `${yield_sig.metric} at ${yield_sig.current}% (${yield_sig.change > 0 ? '+' : ''}${yield_sig.change}%, ${yield_sig.trend}). ${yield_sig.interpretation}. Monitor rate-sensitive sectors (tech, REITs).`,
          sentiment: sentiment,
          metadata: {
            metric: yield_sig.metric,
            current: yield_sig.current,
            change: yield_sig.change,
            trend: yield_sig.trend
          }
        });
      });
      
      console.log(`✅ Yield signals: ${data.length} indicators`);
    } catch (error: any) {
      console.warn('⚠️ Yield signals unavailable:', error.message);
    }
    
    return data;
  }

  private async fetchDollarStrength(): Promise<MacroData[]> {
    const data: MacroData[] = [];
    
    try {
      const mockDollar = {
        index: 104.5,
        change: -0.8,
        trend: 'Weakening',
        interpretation: 'Weak dollar positive for commodities, international stocks, exporters'
      };
      
      data.push({
        source: 'Dollar Index (DXY)',
        type: 'dollar_strength',
        timestamp: new Date(),
        title: `Dollar Index: ${mockDollar.index} (${mockDollar.trend})`,
        content: `DXY at ${mockDollar.index} (${mockDollar.change > 0 ? '+' : ''}${mockDollar.change}%, ${mockDollar.trend}). ${mockDollar.interpretation}. Watch commodities, international exposure.`,
        sentiment: mockDollar.trend === 'Weakening' ? 'bullish' : 'bearish',
        metadata: mockDollar
      });
      
      console.log(`✅ Dollar strength: 1 indicator`);
    } catch (error: any) {
      console.warn('⚠️ Dollar strength unavailable:', error.message);
    }
    
    return data;
  }

  private async fetchCommoditySignals(): Promise<MacroData[]> {
    const data: MacroData[] = [];
    
    try {
      const mockCommodities = [
        {
          commodity: 'Oil (WTI)',
          price: 75.50,
          change: +2.3,
          impact: 'Rising oil pressures inflation, negative for consumer stocks, positive for energy'
        },
        {
          commodity: 'Gold',
          price: 2050,
          change: +1.8,
          impact: 'Gold rising signals risk-off sentiment, uncertainty'
        },
        {
          commodity: 'Copper',
          price: 3.85,
          change: +0.5,
          impact: 'Copper (Dr. Copper) rising signals economic growth expectations'
        }
      ];
      
      mockCommodities.forEach(comm => {
        data.push({
          source: 'Commodity Markets',
          type: 'commodity_signal',
          timestamp: new Date(),
          title: `${comm.commodity}: $${comm.price} (${comm.change > 0 ? '+' : ''}${comm.change}%)`,
          content: `${comm.commodity} at $${comm.price} (${comm.change > 0 ? '+' : ''}${comm.change}%). ${comm.impact}. Commodities signal macro trends affecting sectors.`,
          sentiment: comm.change > 0 ? 'neutral' : 'neutral',
          metadata: comm
        });
      });
      
      console.log(`✅ Commodity signals: ${data.length} commodities`);
    } catch (error: any) {
      console.warn('⚠️ Commodity signals unavailable:', error.message);
    }
    
    return data;
  }

  private async fetchGlobalMarkets(): Promise<MacroData[]> {
    const data: MacroData[] = [];
    
    try {
      const mockGlobal = [
        {
          market: 'Shanghai Composite',
          change: -1.2,
          interpretation: 'China weakness may impact tech supply chains, commodities'
        },
        {
          market: 'European Markets',
          change: +0.8,
          interpretation: 'Europe strength suggests global risk-on sentiment'
        }
      ];
      
      mockGlobal.forEach(mkt => {
        data.push({
          source: 'Global Markets',
          type: 'global_market',
          timestamp: new Date(),
          title: `${mkt.market}: ${mkt.change > 0 ? '+' : ''}${mkt.change}%`,
          content: `${mkt.market} ${mkt.change > 0 ? '+' : ''}${mkt.change}%. ${mkt.interpretation}. Global markets provide context for US equity trends.`,
          sentiment: mkt.change > 0 ? 'bullish' : 'bearish',
          metadata: mkt
        });
      });
      
      console.log(`✅ Global markets: ${data.length} regions`);
    } catch (error: any) {
      console.warn('⚠️ Global markets unavailable:', error.message);
    }
    
    return data;
  }
}

export default new MacroIntelligenceService();
