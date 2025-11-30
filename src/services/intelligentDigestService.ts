// backend/src/services/intelligentDigestService.ts
// FIXED: Better error handling, 2024+ date filtering, silent fails for auth errors

import { Pool } from 'pg';
import crypto from 'crypto';
import secEdgarService from './secEdgarService.js';
import redditService from './redditService.js';
import technicalIndicatorsService from './technicalIndicatorsService.js';
import newsAggregatorService from './newsAggregatorService.js';
import politicalIntelligenceService from './politicalIntelligenceService.js';
import economicDataService from './economicDataService.js';
import cryptoIntelligenceService from './cryptoIntelligenceService.js';
import geopoliticalIntelligenceService from './geopoliticalIntelligenceService.js';
import earningsMAService from './earningsMAService.js';
import manufacturingSupplyChainService from './manufacturingSupplyChainService.js';
import expandedSocialService from './expandedSocialService.js';
import localBusinessService from './localBusinessService.js';

interface DigestEntry {
  sourceType: string;
  sourceName: string;
  rawData: any;
  eventTimestamp: Date;
  contentHash: string;
}

interface AIAnalysis {
  relevanceScore: number;
  summary: string;
  tags: string[];
  entities: {
    tickers: string[];
    people: string[];
    companies: string[];
  };
  importance: 'critical' | 'high' | 'medium' | 'low';
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

class IntelligentDigestService {
  public pool: Pool;
    private sourceCounts: Record<string, { new: number; existing: number }> = {
        'Stock Prices': { new: 0, existing: 0 },
        'Options Flow': { new: 0, existing: 0 },
        'Futures': { new: 0, existing: 0 },
        'Market Indices': { new: 0, existing: 0 },
        'ETF Flows': { new: 0, existing: 0 },
        'Dark Pool': { new: 0, existing: 0 },
        'Short Interest': { new: 0, existing: 0 },
        'Crypto Prices': { new: 0, existing: 0 },
        'Crypto Sentiment': { new: 0, existing: 0 },
        'DeFi TVL': { new: 0, existing: 0 },
        'Whale Movements': { new: 0, existing: 0 },
        'Reddit': { new: 0, existing: 0 },
        'Twitter/X': { new: 0, existing: 0 },
        'StockTwits': { new: 0, existing: 0 },
        'Financial News': { new: 0, existing: 0 },
        'Fed Data': { new: 0, existing: 0 },
        'NASDAQ Dividends': { new: 0, existing: 0 },
        'SEC Filings': { new: 0, existing: 0 },
        'Analyst Ratings': { new: 0, existing: 0 },
        'Insider Trading': { new: 0, existing: 0 },
        'Institutional': { new: 0, existing: 0 },
        'Hedge Funds': { new: 0, existing: 0 },
        'IPO Pipeline': { new: 0, existing: 0 },
        'SPAC Mergers': { new: 0, existing: 0 },
        'FDA Approvals': { new: 0, existing: 0 },
        'Economic Indicators': { new: 0, existing: 0 },
        'Treasury Yields': { new: 0, existing: 0 },
        'US Department of Defense': { new: 0, existing: 0 },
        'Dollar Index': { new: 0, existing: 0 },
        'Commodities': { new: 0, existing: 0 }
      };
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }
  
  private isValidTicker(ticker: string): boolean {
    if (!ticker || typeof ticker !== 'string') return false;
    
    const cleaned = ticker.trim().toUpperCase();
    if (!/^[A-Z]{1,5}$/.test(cleaned)) return false;
    
    const blacklist = new Set([
      'THE', 'AND', 'BUT', 'FOR', 'ARE', 'WITH', 'THIS', 'THAT',
      'FROM', 'WILL', 'MORE', 'SOME', 'BEEN', 'HAVE', 'WERE',
      'WHAT', 'WHEN', 'WHERE', 'WHO', 'WHY', 'HOW', 'WHICH',
      'CAN', 'MAY', 'WOULD', 'COULD', 'SHOULD', 'MIGHT',
      'SAID', 'OVER', 'JUST', 'EVEN', 'MOST', 'ALSO', 'INTO',
      'TECH', 'NEWS', 'DATA', 'INFO', 'CITY', 'STATE', 'SUCH',
      'FISH', 'TOKEN', 'RATE', 'API', 'AI', 'BOND', 'THAN',
      'WHY', 'THEM', 'THEN', 'CISCO', 'S', 'A', 'I'
    ]);
    
    return !blacklist.has(cleaned);
  }
  
  private filterTickers(tickers: string[]): string[] {
    if (!Array.isArray(tickers)) return [];
    return tickers
      .map(t => String(t).toUpperCase().trim())
      .filter(t => this.isValidTicker(t))
      .filter((v, i, a) => a.indexOf(v) === i);
  }
  
    async ingestAndStore(): Promise<{
        collected: number;
        processed: number;
        stored: number;
        duplicates: number;
        stats: any;
        sources: Record<string, { new: number; existing: number }>;
      }> {    console.log('\n🔄 === INTELLIGENT DIGEST INGESTION STARTED ===\n');
          
          this.sourceCounts = {};
          const startTime = Date.now();
          let collected = 0;
          let stored = 0;
          let duplicates = 0;
    try {
      console.log('📡 Step 1: Collecting data from all sources...');
      const rawEntries = await this.collectAllData();
      collected = rawEntries.length;
      console.log(`✅ Collected ${collected} raw entries\n`);
      
      console.log('🤖 Step 2: AI analyzing and categorizing...');
        for (const entry of rawEntries) {
                try {
                  const sourceName = this.mapSourceName(entry.sourceName);
                  if (!this.sourceCounts[sourceName]) {
                    this.sourceCounts[sourceName] = { new: 0, existing: 0 };
                  }
                  
                  if (!this.isValidDate(entry.eventTimestamp)) continue;
                  if (await this.isDuplicate(entry.contentHash)) {
                    duplicates++;
                    this.sourceCounts[sourceName].existing++;
                    continue;
                  }
          
                    const analysis = await this.analyzeWithAI(entry);
                              //console.log(`📊 Analysis for ${entry.sourceName}: score=${analysis.relevanceScore}`);
                              
                              if (analysis.relevanceScore >= 5 || !analysis.relevanceScore) {
                                try {
                                  await this.storeEntry(entry, analysis);
                                  stored++;
                                  this.sourceCounts[sourceName].new++;
                                  console.log(`✅ Stored entry with score ${analysis.relevanceScore}`);
                                } catch (error: any) {
                                  console.error(`❌ Failed to store: ${error.message}`);
                                }
                                this.sourceCounts[sourceName].new++;
                                //console.log(`✅ Stored entry with score ${analysis.relevanceScore}`);
            for (const ticker of analysis.entities.tickers) {
              await this.updateTickerTracking(ticker, analysis);
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      console.log('\n🧹 Step 3: Cleaning up expired data...');
      await this.cleanupExpiredData();
      
      const stats = await this.recordStatistics(collected, stored, duplicates);
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n✅ === DIGEST INGESTION COMPLETE (${duration}s) ===`);
      console.log(`   Collected: ${collected}`);
      console.log(`   Stored: ${stored}`);
      console.log(`   Duplicates: ${duplicates}\n`);
      
        return { collected, processed: collected, stored, duplicates, stats, sources: this.sourceCounts };
    } catch (error) {
      console.error('❌ Digest ingestion failed:', error);
      throw error;
    }
  }
  
  private async collectAllData(): Promise<DigestEntry[]> {
    const entries: DigestEntry[] = [];
    
    try {
      const insiderTrades = await secEdgarService.getRecentInsiderTrades(30);
      entries.push(...insiderTrades.map((trade: any) => ({
        sourceType: 'insider_trade',
        sourceName: 'SEC EDGAR',
        rawData: trade,
        eventTimestamp: new Date(trade.filingDate),
        contentHash: this.generateHash(JSON.stringify(trade))
      })));
      console.log(`  ✓ SEC EDGAR: ${insiderTrades.length} insider trades`);
    } catch (error: any) {
      if (!this.isExpectedError(error)) {
        console.error('  ✗ SEC EDGAR failed:', error.message);
      }
    }
    
    try {
      // Get comprehensive Reddit sentiment analysis
      const comprehensiveSocial = await redditService.getComprehensiveSentiment();
      const socialData = comprehensiveSocial.trending; // Array of trending tickers
      entries.push(...socialData.map((mention: any) => ({
        sourceType: 'social_reddit',
        sourceName: 'Reddit WSB',
        rawData: mention,
        eventTimestamp: new Date(),
        contentHash: this.generateHash(`reddit-${mention.ticker}-${new Date().toDateString()}`)
      })));
      console.log(`  ✓ Reddit: ${socialData.length} ticker mentions`);
    } catch (error: any) {
      if (!this.isExpectedError(error)) {
        console.error('  ✗ Reddit failed:', error.message);
      }
    }
    
    try {
      const news = await newsAggregatorService.getRecentNews(24);
      entries.push(...news.map((article: any) => ({
        sourceType: 'news',
        sourceName: article.source,
        rawData: article,
        eventTimestamp: article.pubDate,
        contentHash: this.generateHash(article.link)
      })));
      console.log(`  ✓ News: ${news.length} articles`);
    } catch (error: any) {
      if (!this.isExpectedError(error)) {
        console.error('  ✗ News aggregation failed:', error.message);
      }
    }
    
    try {
      const political = await politicalIntelligenceService.getGovernmentAnnouncements();
      entries.push(...political.map((announcement: any) => ({
        sourceType: 'political',
        sourceName: announcement.source,
        rawData: announcement,
        eventTimestamp: announcement.publishedDate,
        contentHash: this.generateHash(announcement.url)
      })));
      console.log(`  ✓ Political: ${political.length} announcements`);
    } catch (error: any) {
      if (!this.isExpectedError(error)) {
        console.error('  ✗ Political intelligence failed:', error.message);
      }
    }

    try {
      const economic = await economicDataService.getEconomicIndicators();
      entries.push(...economic.map((indicator: any) => ({
        sourceType: 'economic',
        sourceName: indicator.source,
        rawData: indicator,
        eventTimestamp: indicator.date,
        contentHash: this.generateHash(`${indicator.source}-${indicator.indicator}-${indicator.date}`)
      })));
      console.log(`  ✓ Economic: ${economic.length} indicators`);
    } catch (error: any) {
      if (!this.isExpectedError(error)) {
        console.error('  ✗ Economic data failed:', error.message);
      }
    }
    
    try {
      const cryptoAnnouncements = await cryptoIntelligenceService.getExchangeAnnouncements();
      entries.push(...cryptoAnnouncements.map((announcement: any) => ({
        sourceType: 'crypto',
        sourceName: announcement.exchange,
        rawData: announcement,
        eventTimestamp: announcement.publishedDate,
        contentHash: this.generateHash(announcement.url)
      })));
      console.log(`  ✓ Crypto: ${cryptoAnnouncements.length} announcements`);
    } catch (error: any) {
      if (!this.isExpectedError(error)) {
        console.error('  ✗ Crypto intelligence failed:', error.message);
      }
    }
    
    try {
      const geopolitical = await geopoliticalIntelligenceService.getGeopoliticalEvents();
      entries.push(...geopolitical.map((event: any) => ({
        sourceType: 'geopolitical',
        sourceName: event.source,
        rawData: event,
        eventTimestamp: event.publishedDate,
        contentHash: this.generateHash(event.url)
      })));
      console.log(`  ✓ Geopolitical: ${geopolitical.length} events`);
    } catch (error: any) {
      if (!this.isExpectedError(error)) {
        console.error('  ✗ Geopolitical intelligence failed:', error.message);
      }
    }
    
    try {
      const earningsMA = await earningsMAService.getEarningsAnnouncements();
      entries.push(...earningsMA.map((announcement: any) => ({
        sourceType: 'earnings_ma',
        sourceName: announcement.source,
        rawData: announcement,
        eventTimestamp: announcement.publishedDate,
        contentHash: this.generateHash(announcement.url)
      })));
      console.log(`  ✓ Earnings/M&A: ${earningsMA.length} announcements`);
    } catch (error: any) {
      if (!this.isExpectedError(error)) {
        console.error('  ✗ Earnings/M&A failed:', error.message);
      }
    }
    
    try {
      const manufacturing = await manufacturingSupplyChainService.getManufacturingData();
      entries.push(...manufacturing.map((data: any) => ({
        sourceType: 'manufacturing',
        sourceName: data.source,
        rawData: data,
        eventTimestamp: data.publishedDate,
        contentHash: this.generateHash(data.url)
      })));
      console.log(`  ✓ Manufacturing: ${manufacturing.length} updates`);
    } catch (error: any) {
      if (!this.isExpectedError(error)) {
        console.error('  ✗ Manufacturing failed:', error.message);
      }
    }
    
    try {
      const [hackerNews, redditExpanded] = await Promise.all([
        expandedSocialService.getHackerNewsStories(),
        expandedSocialService.getRedditInvestingSentiment()
      ]);
      
      const socialExpanded = [...hackerNews, ...redditExpanded];
      entries.push(...socialExpanded.map((mention: any) => ({
        sourceType: 'social',
        sourceName: mention.source,
        rawData: mention,
        eventTimestamp: mention.publishedDate,
        contentHash: this.generateHash(mention.url)
      })));
      console.log(`  ✓ Expanded Social: ${socialExpanded.length} posts`);
    } catch (error: any) {
      if (!this.isExpectedError(error)) {
        console.error('  ✗ Expanded Social failed:', error.message);
      }
    }
    
    try {
      const localBusiness = await localBusinessService.getLocalBusinessNews();
      entries.push(...localBusiness.map((news: any) => ({
        sourceType: 'local_business',
        sourceName: news.source,
        rawData: news,
        eventTimestamp: news.publishedDate,
        contentHash: this.generateHash(news.url)
      })));
      console.log(`  ✓ Local Business: ${localBusiness.length} articles`);
    } catch (error: any) {
      if (!this.isExpectedError(error)) {
        console.error('  ✗ Local Business failed:', error.message);
      }
    }
    
    
    // Technical indicators disabled - causes Alpha Vantage timeouts
    console.log('  ⚠️ Technical: 0/3 tickers analyzed (disabled)');
    
    return entries;
  }
  
  private isExpectedError(error: any): boolean {
    if (!error) return false;
    
    const status = error.response?.status;
    if (status === 403 || status === 404 || status === 401) return true;
    
    const code = error.code;
    if (code === 'ETIMEDOUT' || code === 'ECONNABORTED') return true;
    
    return false;
  }
  
  private async analyzeWithAI(entry: DigestEntry): Promise<AIAnalysis> {
    const analysis: AIAnalysis = {
      relevanceScore: 50,
      summary: '',
      tags: [],
      entities: { tickers: [], people: [], companies: [] },
      importance: 'medium',
      sentiment: 'neutral'
    };
    
    if (entry.sourceType === 'insider_trade') {
      const trade = entry.rawData;
      analysis.relevanceScore = trade.totalValue > 1000000 ? 90 : 60;
      analysis.summary = `${trade.insider} (${trade.title}) ${trade.transactionType} ${trade.shares.toLocaleString()} shares of ${trade.ticker} at $${trade.pricePerShare}`;
      analysis.tags = [trade.transactionType, 'insider', trade.ticker];
      analysis.entities.tickers = this.filterTickers([trade.ticker]);
      analysis.entities.people = [trade.insider];
      analysis.importance = trade.totalValue > 5000000 ? 'critical' : 'high';
      analysis.sentiment = trade.transactionType === 'buy' ? 'bullish' : 'bearish';
    }
    
    else if (entry.sourceType === 'social_reddit') {
      const mention = entry.rawData;
      analysis.relevanceScore = Math.min(100, mention.mentions * 5);
      analysis.summary = `${mention.ticker} trending on Reddit with ${mention.mentions} mentions, ${mention.sentiment > 0 ? 'bullish' : 'bearish'} sentiment`;
      analysis.tags = ['social', 'trending', mention.sentiment > 0 ? 'bullish' : 'bearish'];
      analysis.entities.tickers = this.filterTickers([mention.ticker]);
      analysis.importance = mention.mentions > 1000 ? 'high' : 'medium';
      analysis.sentiment = mention.sentiment > 0 ? 'bullish' : 'bearish';
    }
    
    else if (entry.sourceType === 'news') {
      const article = entry.rawData;
      analysis.relevanceScore = newsAggregatorService.calculateRelevance(article);
      analysis.summary = article.title;
      const tickers = newsAggregatorService.extractTickers(`${article.title} ${article.description}`);
      analysis.entities.tickers = this.filterTickers(tickers).slice(0, 3);
      analysis.tags = ['news', article.category || 'market'];
      
      const text = `${article.title} ${article.description}`.toLowerCase();
      if (text.includes('surge') || text.includes('rally') || text.includes('beats')) {
        analysis.sentiment = 'bullish';
      } else if (text.includes('plunge') || text.includes('crash') || text.includes('misses')) {
        analysis.sentiment = 'bearish';
      }
      
      analysis.importance = analysis.relevanceScore >= 70 ? 'high' : 'medium';
    }
    
    else if (entry.sourceType === 'political') {
      const announcement = entry.rawData;
      analysis.relevanceScore = politicalIntelligenceService.calculateRelevance('announcement', announcement);
      analysis.summary = announcement.title;
      analysis.entities.tickers = this.filterTickers(politicalIntelligenceService.extractTickers(announcement.content));
      analysis.tags = ['political', announcement.category];
      analysis.importance = analysis.relevanceScore >= 85 ? 'critical' : 'high';
      
      const text = `${announcement.title} ${announcement.content}`.toLowerCase();
      if (text.includes('rate hike') || text.includes('inflation')) {
        analysis.sentiment = 'bearish';
      } else if (text.includes('rate cut') || text.includes('stimulus') || text.includes('support')) {
        analysis.sentiment = 'bullish';
      }
    }

    else if (entry.sourceType === 'economic') {
      const indicator = entry.rawData;
      analysis.relevanceScore = economicDataService.calculateRelevance(indicator);
      analysis.summary = `${indicator.indicator}: ${indicator.value}`;
      analysis.tags = ['economic', indicator.category];
      analysis.importance = analysis.relevanceScore >= 90 ? 'critical' : 'high';
      
      if (indicator.changePercent) {
        analysis.sentiment = indicator.changePercent > 0 ? 'bullish' : 'bearish';
      }
    }
    
    else if (entry.sourceType === 'crypto') {
      const announcement = entry.rawData;
      analysis.relevanceScore = cryptoIntelligenceService.calculateRelevance('announcement', announcement);
      analysis.summary = announcement.title;
      const symbols = cryptoIntelligenceService.extractCryptoSymbols(`${announcement.title} ${announcement.content}`);
      analysis.entities.tickers = this.filterTickers(symbols).slice(0, 5);
      analysis.tags = ['crypto', announcement.category, announcement.exchange];
      analysis.importance = analysis.relevanceScore >= 75 ? 'high' : 'medium';
      analysis.sentiment = cryptoIntelligenceService.determineSentiment(`${announcement.title} ${announcement.content}`);
    }
    
    else if (entry.sourceType === 'geopolitical') {
      const event = entry.rawData;
      analysis.relevanceScore = geopoliticalIntelligenceService.calculateRelevance(event);
      analysis.summary = event.title;
      analysis.entities.tickers = this.filterTickers([]);
      analysis.tags = ['geopolitical', event.category, event.region];
      analysis.importance = analysis.relevanceScore >= 80 ? 'critical' : 'high';
      analysis.sentiment = 'neutral';
    }
    
    else if (entry.sourceType === 'earnings_ma') {
      const announcement = entry.rawData;
      analysis.relevanceScore = earningsMAService.calculateRelevance(announcement);
      analysis.summary = announcement.title;
      analysis.entities.tickers = this.filterTickers([]);
      analysis.tags = ['earnings', 'ma', announcement.category];
      analysis.importance = analysis.relevanceScore >= 75 ? 'high' : 'medium';
      analysis.sentiment = 'neutral';
    }
    
    else if (entry.sourceType === 'manufacturing') {
      const data = entry.rawData;
      analysis.relevanceScore = manufacturingSupplyChainService.calculateRelevance(data);
      analysis.summary = data.title;
      analysis.entities.tickers = this.filterTickers([]);
      analysis.tags = ['manufacturing', 'supply-chain', data.category];
      analysis.importance = analysis.relevanceScore >= 70 ? 'high' : 'medium';
      analysis.sentiment = 'neutral';
    }
    
    else if (entry.sourceType === 'social') {
      const mention = entry.rawData;
      analysis.relevanceScore = expandedSocialService.calculateRelevance(mention);
      analysis.summary = mention.title;
      analysis.entities.tickers = this.filterTickers(expandedSocialService.extractTickers(mention.content));
      analysis.tags = ['social', mention.platform, mention.category];
      analysis.importance = analysis.relevanceScore >= 65 ? 'high' : 'medium';
      analysis.sentiment = expandedSocialService.determineSentiment(mention);
    }
    
    else if (entry.sourceType === 'local_business') {
      const news = entry.rawData;
      analysis.relevanceScore = localBusinessService.calculateRelevance(news);
      analysis.summary = news.title;
      analysis.entities.tickers = this.filterTickers(localBusinessService.extractTickers(`${news.title} ${news.content}`));
      analysis.tags = ['local-business', news.region, news.category];
      analysis.importance = analysis.relevanceScore >= 60 ? 'medium' : 'low';
      
      const text = `${news.title} ${news.content}`.toLowerCase();
      if (text.includes('expansion') || text.includes('growth')) {
        analysis.sentiment = 'bullish';
      } else if (text.includes('closure') || text.includes('layoffs')) {
        analysis.sentiment = 'bearish';
      }
    }
    
    else if (entry.sourceType === 'technical_signal') {
      const technical = entry.rawData;
      analysis.relevanceScore = 70;
      analysis.summary = `Technical signal for ${technical.ticker}: ${technical.signal}`;
      analysis.entities.tickers = this.filterTickers([technical.ticker]);
      analysis.tags = ['technical', technical.signal];
      analysis.importance = 'medium';
      analysis.sentiment = technical.signal === 'buy' ? 'bullish' : 
                          technical.signal === 'sell' ? 'bearish' : 'neutral';
    }
    
    return analysis;
  }
  
  private async storeEntry(entry: DigestEntry, analysis: AIAnalysis): Promise<void> {
    await this.pool.query(`
      INSERT INTO digest_entries (
        source_type, source_name, raw_data, content_hash,
        ai_summary, ai_relevance_score, ai_importance, ai_sentiment,
        tickers, people, companies, tags,
        event_date, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      entry.sourceType,
      entry.sourceName,
      entry.rawData,
      entry.contentHash,
      analysis.summary,
      analysis.relevanceScore,
      analysis.importance,
      analysis.sentiment,
      analysis.entities.tickers,
      analysis.entities.people,
      analysis.entities.companies,
      analysis.tags,
      entry.eventTimestamp,
      this.calculateExpiration(entry.sourceType)
    ]);
  }
  
  private async isDuplicate(contentHash: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT id FROM digest_entries WHERE content_hash = $1 AND expires_at > NOW() LIMIT 1',
      [contentHash]
    );
    return result.rows.length > 0;
  }
  
  private async updateTickerTracking(ticker: string, analysis: AIAnalysis): Promise<void> {
    await this.pool.query(`
      INSERT INTO ticker_tracking (
        ticker, last_mention, mention_count, avg_sentiment, avg_relevance
      ) VALUES ($1, NOW(), 1, $2::text, $3)
      ON CONFLICT (ticker) DO UPDATE SET
        last_mention = NOW(),
        mention_count = ticker_tracking.mention_count + 1,
        avg_sentiment = $2::text,
        avg_relevance = (ticker_tracking.avg_relevance + $3) / 2
    `, [ticker, analysis.sentiment, analysis.relevanceScore]);
  }
  
  private async getTopTickers(limit: number): Promise<string[]> {
    try {
      const result = await this.pool.query(`
        SELECT ticker, COUNT(*) as mentions
        FROM digest_entries, UNNEST(tickers) ticker
        WHERE event_date > NOW() - INTERVAL '7 days'
        GROUP BY ticker
        ORDER BY mentions DESC
        LIMIT $1
      `, [limit]);
      
      return result.rows.map(row => row.ticker);
    } catch (error) {
      return ['AAPL', 'NVDA', 'TSLA'].slice(0, limit);
    }
  }
  
  private calculateExpiration(sourceType: string): Date {
    const retentionDays: Record<string, number> = {
      'insider_trade': 90,
      'social_reddit': 7,
      'social': 14,
      'news': 30,
      'technical_signal': 14,
      'economic': 180,
      'political': 180,
      'crypto': 30,
      'geopolitical': 90,
      'earnings_ma': 60,
      'manufacturing': 60,
      'local_business': 45
    };
    
    const days = retentionDays[sourceType] || 30;
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    return expires;
  }
  
  private async cleanupExpiredData(): Promise<void> {
    const result = await this.pool.query(`
      DELETE FROM digest_entries
      WHERE expires_at < NOW()
      RETURNING id
    `);
    console.log(`  ✓ Removed ${result.rowCount} expired entries`);
  }
  
  private async recordStatistics(collected: number, stored: number, duplicates: number): Promise<any> {
    const stats = await this.pool.query(`
      INSERT INTO digest_stats (
        date, total_collected, total_stored, duplicates_filtered
      ) VALUES (CURRENT_DATE, $1, $2, $3)
      ON CONFLICT (date) DO UPDATE SET
        total_collected = digest_stats.total_collected + $1,
        total_stored = digest_stats.total_stored + $2,
        duplicates_filtered = digest_stats.duplicates_filtered + $3
      RETURNING *
    `, [collected, stored, duplicates]);
    
    return stats.rows[0];
  }
  
  async getDigestSummary(): Promise<any> {
    const [total, byType, recent] = await Promise.all([
      this.pool.query('SELECT COUNT(*) as count FROM digest_entries WHERE expires_at > NOW()'),
      this.pool.query(`
        SELECT source_type, COUNT(*) as count, AVG(ai_relevance_score) as avg_score
        FROM digest_entries
        WHERE expires_at > NOW()
        GROUP BY source_type
        ORDER BY count DESC
      `),
      this.pool.query(`
        SELECT ticker, COUNT(*) as mention_count, 
               STRING_AGG(DISTINCT ai_sentiment, ', ') as ai_sentiment
        FROM digest_entries, UNNEST(tickers) ticker
        WHERE event_date > NOW() - INTERVAL '7 days'
        GROUP BY ticker
        ORDER BY mention_count DESC
        LIMIT 10
      `)
    ]);
    
    return {
      totalEntries: parseInt(total.rows[0].count),
      byType: byType.rows,
      trendingTickers: recent.rows
    };
  }
  
  private generateHash(content: string | any): string {
    try {
      const contentString = typeof content === 'string' ? content : JSON.stringify(content);
      return crypto.createHash('sha256').update(contentString).digest('hex');
    } catch (error) {
      return crypto.createHash('sha256').update(Date.now().toString()).digest('hex');
    }
  }
  
  /**
   * FIXED: Only accepts dates from 2024-01-01 onwards
   */
  private isValidDate(date: Date): boolean {
    const timestamp = date.getTime();
    
    if (isNaN(timestamp)) return false;
    
    // Allow up to 7 days future
    const maxFuture = Date.now() + (7 * 24 * 60 * 60 * 1000);
    if (timestamp > maxFuture) return false;
    
    // Only accept 2024+
    const cutoffDate = new Date('2024-01-01T00:00:00Z').getTime();
    if (timestamp < cutoffDate) return false;
    
    return true;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
    private mapSourceName(rawName: string): string {
        const mapping: Record<string, string> = {
          'SEC EDGAR': 'Insider Trading',
          'Reddit WSB': 'Reddit',
          'Reuters Business': 'Financial News',
          'CNBC Breaking News': 'Financial News',
          'MarketWatch Top Stories': 'Financial News',
          'Federal Reserve': 'Fed Data',
          'White House': 'Political News',
          'SEC Press Releases': 'SEC Filings',
          'BLS Economic News': 'Economic Indicators',
          'Census Economic Indicators': 'Economic Indicators',
          'Coinbase': 'Crypto Prices',
          'Binance': 'Crypto Prices',
          'Ethereum Foundation': 'Crypto Prices'
        };
        return mapping[rawName] || rawName;
      }
}

export default new IntelligentDigestService();
