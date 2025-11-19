// backend/src/services/cryptoIntelligenceService.ts
// Crypto Intelligence - Whale Alerts, Exchange News, DeFi Protocol Updates

import axios from 'axios';
import * as cheerio from 'cheerio';

interface WhaleTransaction {
  blockchain: string;
  amount: number;
  amountUSD: number;
  from: string;
  to: string;
  hash: string;
  timestamp: Date;
  symbol: string;
}

interface ExchangeAnnouncement {
  exchange: string;
  title: string;
  content: string;
  url: string;
  publishedDate: Date;
  category: string;
}

interface DeFiUpdate {
  protocol: string;
  title: string;
  content: string;
  url: string;
  publishedDate: Date;
  category: string;
}

class CryptoIntelligenceService {
  
  private CRYPTO_RSS_FEEDS = [
    // Exchange Announcements
    { url: 'https://blog.coinbase.com/feed', name: 'Coinbase', category: 'exchange' },
    { url: 'https://www.binance.com/en/blog/rss.xml', name: 'Binance', category: 'exchange' },
    { url: 'https://blog.kraken.com/feed', name: 'Kraken', category: 'exchange' },
    
    // DeFi Protocols
    { url: 'https://blog.uniswap.org/rss.xml', name: 'Uniswap', category: 'defi' },
    { url: 'https://blog.aave.com/rss/', name: 'Aave', category: 'defi' },
    { url: 'https://compound.finance/governance/rss', name: 'Compound', category: 'defi' },
    
    // Blockchain Networks
    { url: 'https://blog.ethereum.org/feed.xml', name: 'Ethereum Foundation', category: 'blockchain' },
    { url: 'https://solana.com/news/rss.xml', name: 'Solana', category: 'blockchain' },
    
    // Crypto Analytics
    { url: 'https://blog.chainalysis.com/feed/', name: 'Chainalysis', category: 'analytics' },
    { url: 'https://insights.glassnode.com/feed/', name: 'Glassnode', category: 'analytics' },
  ];

  /**
   * Get whale transactions (large crypto movements)
   * Note: This would integrate with Whale Alert API (requires API key)
   * For now, returns empty array - implement when API key available
   */
  async getWhaleTransactions(): Promise<WhaleTransaction[]> {
    const whales: WhaleTransaction[] = [];
    
    try {
      // TODO: Integrate Whale Alert API
      // https://whale-alert.io/api
      // Free tier: 1000 calls/month
      
      // For now, return mock data to prevent errors
      // Uncomment below when API key is available:
      
      /*
      const WHALE_ALERT_API_KEY = process.env.WHALE_ALERT_API_KEY;
      if (!WHALE_ALERT_API_KEY) {
        console.log('  ⓘ Whale Alert API key not configured (optional)');
        return whales;
      }

      const response = await axios.get('https://api.whale-alert.io/v1/transactions', {
        params: {
          api_key: WHALE_ALERT_API_KEY,
          min_value: 1000000, // $1M+ transactions
          limit: 50
        },
        timeout: 10000
      });

      if (response.data && response.data.transactions) {
        whales.push(...response.data.transactions.map((tx: any) => ({
          blockchain: tx.blockchain,
          amount: tx.amount,
          amountUSD: tx.amount_usd,
          from: tx.from?.address || 'Unknown',
          to: tx.to?.address || 'Unknown',
          hash: tx.hash,
          timestamp: new Date(tx.timestamp * 1000),
          symbol: tx.symbol
        })));
      }
      */
      
      console.log(`  ⓘ Whale tracking: Disabled (API key not configured)`);
      return whales;
    } catch (error) {
      console.error('  ✗ Whale Alert failed:', error instanceof Error ? error.message : 'Unknown');
      return whales;
    }
  }

  /**
   * Get exchange announcements from RSS feeds
   */
  async getExchangeAnnouncements(): Promise<ExchangeAnnouncement[]> {
    const announcements: ExchangeAnnouncement[] = [];
    
    for (const feed of this.CRYPTO_RSS_FEEDS) {
      try {
        const items = await this.fetchRSSFeed(feed.url);
        
        const feedAnnouncements = items.map((item: any) => ({
          exchange: feed.name,
          title: item.title || '',
          content: item.description || '',
          url: item.link || '',
          publishedDate: new Date(item.pubDate || Date.now()),
          category: feed.category
        }));
        
        announcements.push(...feedAnnouncements);
        console.log(`  ✓ ${feed.name}: ${feedAnnouncements.length} updates`);
      } catch (error) {
        console.error(`  ✗ ${feed.name} failed:`, error instanceof Error ? error.message : 'Unknown');
      }
    }
    
    return announcements;
  }

  /**
   * Fetch RSS feed
   */
  private async fetchRSSFeed(url: string): Promise<any[]> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'MarketAI/1.0'
        }
      });

      const $ = cheerio.load(response.data, { xmlMode: true });
      const items: any[] = [];

      $('item, entry').each((_, element) => {
        const $item = $(element);
        items.push({
          title: $item.find('title').text(),
          description: $item.find('description, summary, content').first().text(),
          link: $item.find('link').attr('href') || $item.find('link').text(),
          pubDate: $item.find('pubDate, published, updated').first().text(),
        });
      });

      return items;
    } catch (error) {
      throw new Error(`RSS fetch failed: ${error}`);
    }
  }

  /**
   * Calculate relevance score for crypto data
   */
  calculateRelevance(type: 'whale' | 'announcement', data: any): number {
    if (type === 'whale') {
      const whale = data as WhaleTransaction;
      let score = 70; // Base score for whale transactions
      
      // Large transactions are more relevant
      if (whale.amountUSD > 50000000) score += 20;  // $50M+
      else if (whale.amountUSD > 10000000) score += 15; // $10M+
      else if (whale.amountUSD > 5000000) score += 10; // $5M+
      
      // Major cryptocurrencies
      const majorCoins = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB'];
      if (majorCoins.includes(whale.symbol)) score += 5;
      
      // Exchange movements (deposits/withdrawals)
      if (whale.from.includes('binance') || whale.to.includes('binance') ||
          whale.from.includes('coinbase') || whale.to.includes('coinbase')) {
        score += 10;
      }
      
      return Math.min(100, score);
    }
    
    if (type === 'announcement') {
      const announcement = data as ExchangeAnnouncement;
      let score = 60; // Base score for crypto announcements
      
      const text = `${announcement.title} ${announcement.content}`.toLowerCase();
      
      // High-impact keywords
      const criticalKeywords = [
        'listing', 'delisting', 'security breach', 'hack', 'suspended',
        'regulation', 'sec', 'lawsuit', 'settlement', 'bankruptcy'
      ];
      
      const importantKeywords = [
        'staking', 'yield', 'apy', 'rewards', 'token', 'mainnet',
        'upgrade', 'fork', 'governance', 'proposal', 'launch'
      ];
      
      // Check critical keywords (+15 each)
      for (const keyword of criticalKeywords) {
        if (text.includes(keyword)) score += 15;
      }
      
      // Check important keywords (+8 each)
      for (const keyword of importantKeywords) {
        if (text.includes(keyword)) score += 8;
      }
      
      // Major exchanges get higher scores
      const majorExchanges = ['Coinbase', 'Binance', 'Kraken'];
      if (majorExchanges.includes(announcement.exchange)) {
        score += 5;
      }
      
      // DeFi protocols get attention
      if (announcement.category === 'defi') {
        score += 8;
      }
      
      // Recency bonus
      const hoursOld = (Date.now() - announcement.publishedDate.getTime()) / (1000 * 60 * 60);
      if (hoursOld < 1) score += 10;
      else if (hoursOld < 6) score += 5;
      
      return Math.min(100, score);
    }
    
    return 50;
  }

  /**
   * Extract crypto symbols from text
   */
  extractCryptoSymbols(text: string): string[] {
    const symbols = new Set<string>();
    
    // Common crypto patterns
    const cryptoPatterns = [
      /\$([A-Z]{2,10})\b/g,  // $BTC, $ETH
      /\b(BTC|ETH|USDT|USDC|BNB|SOL|ADA|XRP|DOGE|MATIC|DOT|AVAX|LINK|UNI|ATOM|LTC|etc)\b/gi,
    ];
    
    for (const pattern of cryptoPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const symbol = match[1].toUpperCase();
        if (symbol && symbol.length >= 2 && symbol.length <= 10) {
          symbols.add(symbol);
        }
      }
    }
    
    // Common full names to symbols
    const nameMap: Record<string, string> = {
      'bitcoin': 'BTC',
      'ethereum': 'ETH',
      'tether': 'USDT',
      'solana': 'SOL',
      'cardano': 'ADA',
      'ripple': 'XRP',
      'dogecoin': 'DOGE',
      'polygon': 'MATIC',
      'polkadot': 'DOT',
      'avalanche': 'AVAX',
      'chainlink': 'LINK',
      'uniswap': 'UNI',
      'cosmos': 'ATOM',
      'litecoin': 'LTC'
    };
    
    const textLower = text.toLowerCase();
    for (const [name, symbol] of Object.entries(nameMap)) {
      if (textLower.includes(name)) {
        symbols.add(symbol);
      }
    }
    
    return Array.from(symbols);
  }

  /**
   * Determine sentiment from crypto text
   */
  determineSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
    const textLower = text.toLowerCase();
    
    const bullishKeywords = [
      'listing', 'launch', 'partnership', 'upgrade', 'adoption',
      'bullish', 'surge', 'rally', 'breakthrough', 'approved'
    ];
    
    const bearishKeywords = [
      'delisting', 'hack', 'breach', 'suspended', 'investigation',
      'bearish', 'crash', 'vulnerability', 'banned', 'regulation'
    ];
    
    let bullishCount = 0;
    let bearishCount = 0;
    
    for (const keyword of bullishKeywords) {
      if (textLower.includes(keyword)) bullishCount++;
    }
    
    for (const keyword of bearishKeywords) {
      if (textLower.includes(keyword)) bearishCount++;
    }
    
    if (bullishCount > bearishCount) return 'bullish';
    if (bearishCount > bullishCount) return 'bearish';
    return 'neutral';
  }
}

export default new CryptoIntelligenceService();
