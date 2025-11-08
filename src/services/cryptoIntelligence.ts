// src/services/cryptoIntelligence.ts
// PHASE 8A: Crypto market intelligence - whale wallets, exchange flows, sentiment

import axios from 'axios';

interface CryptoData {
  source: string;
  type: 'crypto_whale' | 'exchange_flow' | 'crypto_sentiment' | 'crypto_correlation';
  timestamp: Date;
  title: string;
  content: string;
  ticker?: string;
  crypto?: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  metadata: any;
}

class CryptoIntelligenceService {
  
  /**
   * Fetch all crypto intelligence
   */
  async fetchAll(): Promise<CryptoData[]> {
    console.log('₿ Fetching crypto intelligence...');
    
    const allData: CryptoData[] = [];
    
    try {
      // Fetch whale wallet movements
      const whales = await this.fetchWhaleMovements();
      allData.push(...whales);
      
      // Fetch exchange inflows/outflows
      const flows = await this.fetchExchangeFlows();
      allData.push(...flows);
      
      // Fetch crypto sentiment
      const sentiment = await this.fetchCryptoSentiment();
      allData.push(...sentiment);
      
      // Fetch crypto-stock correlations
      const correlations = await this.fetchCryptoStockCorrelations();
      allData.push(...correlations);
      
      console.log(`✅ Crypto intelligence: ${allData.length} items`);
      return allData;
      
    } catch (error: any) {
      console.error('❌ Crypto intelligence error:', error.message);
      return allData;
    }
  }

  /**
   * Fetch whale wallet movements
   * Large crypto transactions that may signal market moves
   */
  async fetchWhaleMovements(): Promise<CryptoData[]> {
    const data: CryptoData[] = [];
    
    try {
      // Mock whale movements (use Whale Alert API in production)
      const mockWhales = [
        {
          crypto: 'BTC',
          amount: 5000,
          value: 215000000,
          from: 'Unknown Wallet',
          to: 'Binance',
          type: 'exchange_deposit',
          time: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
          crypto: 'ETH',
          amount: 45000,
          value: 98000000,
          from: 'Coinbase',
          to: 'Unknown Wallet',
          type: 'exchange_withdrawal',
          time: new Date(Date.now() - 5 * 60 * 60 * 1000)
        },
        {
          crypto: 'BTC',
          amount: 2500,
          value: 107500000,
          from: 'Kraken',
          to: 'Cold Wallet',
          type: 'exchange_withdrawal',
          time: new Date(Date.now() - 8 * 60 * 60 * 1000)
        }
      ];
      
      mockWhales.forEach(whale => {
        const sentiment = whale.type === 'exchange_withdrawal' ? 'bullish' : 'bearish';
        const interpretation = whale.type === 'exchange_withdrawal' 
          ? 'moved to cold storage (accumulation signal)'
          : 'moved to exchange (potential selling pressure)';
        
        data.push({
          source: 'Whale Alert',
          type: 'crypto_whale',
          timestamp: whale.time,
          title: `${whale.amount.toLocaleString()} ${whale.crypto} whale movement`,
          content: `Whale moved ${whale.amount.toLocaleString()} ${whale.crypto} ($${(whale.value / 1_000_000).toFixed(1)}M) from ${whale.from} to ${whale.to}. This ${interpretation}. Correlation: ${whale.crypto}-related stocks (MSTR, COIN) may be affected.`,
          crypto: whale.crypto,
          sentiment: sentiment,
          metadata: {
            amount: whale.amount,
            value: whale.value,
            from: whale.from,
            to: whale.to,
            type: whale.type,
            relatedStocks: whale.crypto === 'BTC' ? ['MSTR', 'COIN', 'MARA', 'RIOT'] : ['COIN', 'ETH']
          }
        });
      });
      
      console.log(`✅ Whale movements: ${data.length} transactions`);
      
    } catch (error: any) {
      console.warn('⚠️ Whale movements unavailable:', error.message);
    }
    
    return data;
  }

  /**
   * Fetch exchange inflows/outflows
   * Net flow indicates buying vs selling pressure
   */
  async fetchExchangeFlows(): Promise<CryptoData[]> {
    const data: CryptoData[] = [];
    
    try {
      // Mock exchange flows (use Glassnode or CryptoQuant API)
      const mockFlows = [
        {
          crypto: 'BTC',
          exchange: 'All Exchanges',
          netFlow: -15000,
          inflow: 25000,
          outflow: 40000,
          period: '24h'
        },
        {
          crypto: 'ETH',
          exchange: 'All Exchanges',
          netFlow: 35000,
          inflow: 80000,
          outflow: 45000,
          period: '24h'
        }
      ];
      
      mockFlows.forEach(flow => {
        const sentiment = flow.netFlow < 0 ? 'bullish' : 'bearish';
        const direction = flow.netFlow < 0 ? 'outflow' : 'inflow';
        const interpretation = flow.netFlow < 0
          ? 'Coins leaving exchanges (accumulation, bullish)'
          : 'Coins entering exchanges (potential selling, bearish)';
        
        data.push({
          source: 'Exchange Flow Analysis',
          type: 'exchange_flow',
          timestamp: new Date(),
          title: `${flow.crypto} net ${direction}: ${Math.abs(flow.netFlow).toLocaleString()} coins`,
          content: `${flow.crypto} net ${direction} of ${Math.abs(flow.netFlow).toLocaleString()} coins in ${flow.period}. ${interpretation}. Impact on ${flow.crypto}-exposed stocks (MSTR, COIN, miners).`,
          crypto: flow.crypto,
          sentiment: sentiment,
          metadata: {
            netFlow: flow.netFlow,
            inflow: flow.inflow,
            outflow: flow.outflow,
            period: flow.period,
            relatedStocks: flow.crypto === 'BTC' ? ['MSTR', 'COIN', 'MARA', 'RIOT'] : ['COIN']
          }
        });
      });
      
      console.log(`✅ Exchange flows: ${data.length} reports`);
      
    } catch (error: any) {
      console.warn('⚠️ Exchange flows unavailable:', error.message);
    }
    
    return data;
  }

  /**
   * Fetch crypto sentiment
   * Social sentiment and fear/greed index
   */
  async fetchCryptoSentiment(): Promise<CryptoData[]> {
    const data: CryptoData[] = [];
    
    try {
      // Mock crypto sentiment (use LunarCrush, Fear & Greed Index)
      const mockSentiment = [
        {
          metric: 'Fear & Greed Index',
          value: 68,
          label: 'Greed',
          interpretation: 'Market showing greed, potential for pullback'
        },
        {
          metric: 'Bitcoin Social Volume',
          value: 85,
          label: 'Very High',
          interpretation: 'Extreme social attention, near-term top risk'
        },
        {
          metric: 'Ethereum Sentiment Score',
          value: 72,
          label: 'Bullish',
          interpretation: 'Positive sentiment, upgrade momentum'
        }
      ];
      
      mockSentiment.forEach(sentiment => {
        data.push({
          source: 'Crypto Sentiment Analysis',
          type: 'crypto_sentiment',
          timestamp: new Date(),
          title: `${sentiment.metric}: ${sentiment.value}/100 (${sentiment.label})`,
          content: `${sentiment.metric} at ${sentiment.value}/100 (${sentiment.label}). ${sentiment.interpretation}. Affects crypto-exposed stocks and broader tech sentiment.`,
          sentiment: sentiment.value > 60 ? 'bullish' : sentiment.value < 40 ? 'bearish' : 'neutral',
          metadata: {
            metric: sentiment.metric,
            value: sentiment.value,
            label: sentiment.label,
            relatedStocks: ['MSTR', 'COIN', 'MARA', 'RIOT', 'SQ', 'PYPL']
          }
        });
      });
      
      console.log(`✅ Crypto sentiment: ${data.length} metrics`);
      
    } catch (error: any) {
      console.warn('⚠️ Crypto sentiment unavailable:', error.message);
    }
    
    return data;
  }

  /**
   * Fetch crypto-stock correlations
   * How crypto moves affect related stocks
   */
  async fetchCryptoStockCorrelations(): Promise<CryptoData[]> {
    const data: CryptoData[] = [];
    
    try {
      // Mock correlations
      const mockCorrelations = [
        {
          crypto: 'BTC',
          ticker: 'MSTR',
          correlation: 0.92,
          interpretation: 'Very high correlation - MSTR acts as Bitcoin proxy'
        },
        {
          crypto: 'BTC',
          ticker: 'COIN',
          correlation: 0.85,
          interpretation: 'High correlation - Coinbase revenue tied to crypto volume'
        },
        {
          crypto: 'BTC',
          ticker: 'MARA',
          correlation: 0.88,
          interpretation: 'High correlation - Bitcoin miner revenue directly tied to BTC price'
        }
      ];
      
      mockCorrelations.forEach(corr => {
        data.push({
          source: 'Crypto-Stock Correlation',
          type: 'crypto_correlation',
          timestamp: new Date(),
          title: `${corr.ticker} / ${corr.crypto} correlation: ${(corr.correlation * 100).toFixed(0)}%`,
          content: `${corr.ticker} shows ${(corr.correlation * 100).toFixed(0)}% correlation with ${corr.crypto}. ${corr.interpretation}. ${corr.crypto} movements should be monitored for ${corr.ticker} trading signals.`,
          ticker: corr.ticker,
          crypto: corr.crypto,
          sentiment: 'neutral',
          metadata: {
            correlation: corr.correlation,
            strength: corr.correlation > 0.8 ? 'very_high' : corr.correlation > 0.6 ? 'high' : 'moderate'
          }
        });
      });
      
      console.log(`✅ Crypto correlations: ${data.length} pairs`);
      
    } catch (error: any) {
      console.warn('⚠️ Crypto correlations unavailable:', error.message);
    }
    
    return data;
  }

  /**
   * Get crypto data for specific ticker
   */
  async getForTicker(ticker: string): Promise<CryptoData[]> {
    const allData = await this.fetchAll();
    return allData.filter(item => 
      item.ticker?.toUpperCase() === ticker.toUpperCase() ||
      item.metadata?.relatedStocks?.includes(ticker.toUpperCase())
    );
  }
}

export default new CryptoIntelligenceService();
