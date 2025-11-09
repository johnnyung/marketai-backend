// backend/src/services/intelligentDigestService.ts
// COMPLETE VERSION WITH PHASES 1, 2, 3

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
  
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }
  
  async ingestAndStore(): Promise<{
    collected: number;
    processed: number;
    stored: number;
    duplicates: number;
    stats: any;
  }> {
    console.log('\n🔄 === INTELLIGENT DIGEST INGESTION STARTED ===\n');
    
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
          if (await this.isDuplicate(entry.contentHash)) {
            duplicates++;
            continue;
          }
          
          const analysis = await this.analyzeWithAI(entry);
          
          if (analysis.relevanceScore >= 40) {
            await this.storeEntry(entry, analysis);
            stored++;
            
            for (const ticker of analysis.entities.tickers) {
              await this.updateTickerTracking(ticker, analysis);
            }
          } else {
            console.log(`⚠️ Skipping low relevance (${analysis.relevanceScore}/100)`);
          }
          
        } catch (error) {
          console.error('Error processing entry:', error);
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
      console.log(`   Duplicates: ${duplicates}`);
      console.log(`   Processing rate: ${(stored / parseFloat(duration) * 60).toFixed(0)} entries/min\n`);
      
      return { collected, processed: collected, stored, duplicates, stats };
      
    } catch (error) {
      console.error('❌ Digest ingestion failed:', error);
      throw error;
    }
  }
  
  private async collectAllData(): Promise<DigestEntry[]> {
    const entries: DigestEntry[] = [];
    
    // Source 1: SEC EDGAR
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
    } catch (error) {
      console.error('  ✗ SEC EDGAR failed:', error);
    }
    
    // Source 2: Reddit
    try {
      const socialData = await redditService.getWallStreetBetsSentiment();
      entries.push(...socialData.map((mention: any) => ({
        sourceType: 'social_reddit',
        sourceName: 'Reddit WSB',
        rawData: mention,
        eventTimestamp: new Date(),
        contentHash: this.generateHash(`reddit-${mention.ticker}-${new Date().toDateString()}`)
      })));
      console.log(`  ✓ Reddit: ${socialData.length} ticker mentions`);
    } catch (error) {
      console.error('  ✗ Reddit failed:', error);
    }
    
    // Source 3: NEWS FEEDS (PHASE 1 - 30 sources)
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
    } catch (error) {
      console.error('  ✗ News aggregation failed:', error);
    }
    
    // Source 4: POLITICAL INTELLIGENCE (PHASE 2 - NEW!)
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
    } catch (error) {
      console.error('  ✗ Political intelligence failed:', error);
    }

    // Source 5: ECONOMIC DATA (PHASE 3 - NEW!)
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
    } catch (error) {
      console.error('  ✗ Economic data failed:', error);
    }
    
    // Source 6: CRYPTO INTELLIGENCE (PHASE 4 - NEW!)
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
    } catch (error) {
      console.error('  ✗ Crypto intelligence failed:', error);
    }
    
    // Source 7: GEOPOLITICAL INTELLIGENCE (PHASE 5 - NEW!)
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
    } catch (error) {
      console.error('  ✗ Geopolitical intelligence failed:', error);
    }
    
    // Source 8: EARNINGS & M&A (PHASE 6 - NEW!)
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
    } catch (error) {
      console.error('  ✗ Earnings/M&A failed:', error);
    }
    
    // Source 9: MANUFACTURING & SUPPLY CHAIN (PHASE 8 - NEW!)
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
    } catch (error) {
      console.error('  ✗ Manufacturing failed:', error);
    }
    
    // Source 10: EXPANDED SOCIAL (PHASE 9 - NEW!)
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
    } catch (error) {
      console.error('  ✗ Expanded Social failed:', error);
    }
    
    // Source 11: LOCAL BUSINESS (PHASE 10 - NEW!)
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
    } catch (error) {
      console.error('  ✗ Local Business failed:', error);
    }
    
    // Source 12: Technical (reduced frequency to save API calls)
    try {
      const topTickers = await this.getTopTickers(3); // Reduced from 5 to 3
      for (const ticker of topTickers) {
        const technical = await technicalIndicatorsService.getTechnicalIndicators(ticker);
        if (technical) {
          entries.push({
            sourceType: 'technical_signal',
            sourceName: 'Alpha Vantage',
            rawData: technical,
            eventTimestamp: new Date(),
            contentHash: this.generateHash(`technical-${ticker}-${new Date().toDateString()}`)
          });
        }
        await this.sleep(13000);
      }
      console.log(`  ✓ Technical: ${topTickers.length} tickers analyzed`);
    } catch (error) {
      console.error('  ✗ Technical analysis failed:', error);
    }
    
    return entries;
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
      analysis.entities.tickers = [trade.ticker];
      analysis.entities.people = [trade.insider];
      analysis.importance = trade.totalValue > 5000000 ? 'critical' : 'high';
      analysis.sentiment = trade.transactionType === 'buy' ? 'bullish' : 'bearish';
    }
    
    else if (entry.sourceType === 'social_reddit') {
      const mention = entry.rawData;
      analysis.relevanceScore = Math.min(100, mention.mentions * 5);
      analysis.summary = `${mention.ticker} trending on Reddit with ${mention.mentions} mentions, ${mention.sentiment > 0 ? 'bullish' : 'bearish'} sentiment`;
      analysis.tags = ['social', 'trending', mention.sentiment > 0 ? 'bullish' : 'bearish'];
      analysis.entities.tickers = [mention.ticker];
      analysis.importance = mention.mentions > 1000 ? 'high' : 'medium';
      analysis.sentiment = mention.sentiment > 0 ? 'bullish' : 'bearish';
    }
    
    else if (entry.sourceType === 'news') {
      const article = entry.rawData;
      analysis.relevanceScore = newsAggregatorService.calculateRelevance(article);
      analysis.summary = article.title;
      const tickers = newsAggregatorService.extractTickers(`${article.title} ${article.description}`);
      analysis.entities.tickers = tickers.slice(0, 3);
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
      analysis.entities.tickers = politicalIntelligenceService.extractTickers(announcement.content);
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
      
      // Interpret economic data
      if (indicator.changePercent) {
        if (indicator.changePercent > 0) {
          analysis.sentiment = 'bullish';
        } else if (indicator.changePercent < 0) {
          analysis.sentiment = 'bearish';
        }
      }
    }
    
    else if (entry.sourceType === 'crypto') {
      const announcement = entry.rawData;
      analysis.relevanceScore = cryptoIntelligenceService.calculateRelevance('announcement', announcement);
      analysis.summary = announcement.title;
      const symbols = cryptoIntelligenceService.extractCryptoSymbols(`${announcement.title} ${announcement.content}`);
      analysis.entities.tickers = symbols.slice(0, 5); // Store crypto symbols in tickers field
      analysis.tags = ['crypto', announcement.category, announcement.exchange];
      analysis.importance = analysis.relevanceScore >= 75 ? 'high' : 'medium';
      analysis.sentiment = cryptoIntelligenceService.determineSentiment(`${announcement.title} ${announcement.content}`);
    }
    
    else if (entry.sourceType === 'geopolitical') {
      const event = entry.rawData;
      analysis.relevanceScore = geopoliticalIntelligenceService.calculateRelevance(event);
      analysis.summary = event.title;
      analysis.entities.tickers = geopoliticalIntelligenceService.extractRelevantTickers(`${event.title} ${event.content}`);
      analysis.tags = ['geopolitical', event.category, event.region];
      analysis.importance = analysis.relevanceScore >= 85 ? 'critical' : 'high';
      analysis.sentiment = geopoliticalIntelligenceService.determineSentiment(event);
    }
    
    else if (entry.sourceType === 'earnings_ma') {
      const announcement = entry.rawData;
      analysis.relevanceScore = earningsMAService.calculateRelevance(announcement);
      analysis.summary = announcement.title;
      analysis.entities.tickers = earningsMAService.extractTickers(`${announcement.title} ${announcement.content}`);
      analysis.tags = ['earnings', announcement.category];
      analysis.importance = analysis.relevanceScore >= 85 ? 'critical' : 'high';
      analysis.sentiment = earningsMAService.determineSentiment(announcement);
    }
    
    else if (entry.sourceType === 'manufacturing') {
      const data = entry.rawData;
      analysis.relevanceScore = manufacturingSupplyChainService.calculateRelevance(data);
      analysis.summary = data.title;
      analysis.entities.tickers = manufacturingSupplyChainService.extractRelevantTickers(`${data.title} ${data.content}`);
      analysis.tags = ['manufacturing', data.category];
      analysis.importance = analysis.relevanceScore >= 75 ? 'high' : 'medium';
      analysis.sentiment = manufacturingSupplyChainService.determineSentiment(data);
    }
    
    else if (entry.sourceType === 'social') {
      const mention = entry.rawData;
      analysis.relevanceScore = expandedSocialService.calculateRelevance(mention);
      analysis.summary = mention.title;
      analysis.entities.tickers = expandedSocialService.extractTickers(`${mention.title} ${mention.content}`);
      analysis.tags = ['social', mention.platform];
      analysis.importance = analysis.relevanceScore >= 60 ? 'medium' : 'low';
      analysis.sentiment = expandedSocialService.determineSentiment(mention);
    }
    
    else if (entry.sourceType === 'local_business') {
      const news = entry.rawData;
      analysis.relevanceScore = localBusinessService.calculateRelevance(news);
      analysis.summary = news.title;
      analysis.entities.tickers = localBusinessService.extractTickers(`${news.title} ${news.content}`);
      analysis.tags = ['local_business', news.city];
      analysis.importance = analysis.relevanceScore >= 70 ? 'high' : 'medium';
      analysis.sentiment = localBusinessService.determineSentiment(news);
    }
    
    else if (entry.sourceType === 'technical_signal') {
      const tech = entry.rawData;
      analysis.relevanceScore = tech.signals.length * 15;
      analysis.summary = `${tech.ticker} technical signals: ${tech.signals.join(', ')}`;
      analysis.tags = ['technical', ...tech.signals.map((s: string) => s.split(' ')[0].toLowerCase())];
      analysis.entities.tickers = [tech.ticker];
      analysis.importance = tech.overallSignal === 'bullish' || tech.overallSignal === 'bearish' ? 'high' : 'medium';
      analysis.sentiment = tech.overallSignal;
    }
    
    return analysis;
  }
  
  private async storeEntry(entry: DigestEntry, analysis: AIAnalysis): Promise<void> {
    const expiresAt = this.calculateExpiration(entry.sourceType);
    
    await this.pool.query(`
      INSERT INTO digest_entries (
        source_type, source_name, raw_data,
        ai_relevance_score, ai_summary, ai_category, 
        ai_importance, ai_sentiment,
        tickers, people, companies,
        event_date, expires_at, content_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (content_hash) DO NOTHING
    `, [
      entry.sourceType,
      entry.sourceName,
      JSON.stringify(entry.rawData),
      analysis.relevanceScore,
      analysis.summary,
      analysis.tags,
      analysis.importance,
      analysis.sentiment,
      analysis.entities.tickers,
      analysis.entities.people,
      analysis.entities.companies,
      entry.eventTimestamp,
      expiresAt,
      entry.contentHash
    ]);
  }
  
  private async isDuplicate(contentHash: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT id FROM digest_entries WHERE content_hash = $1',
      [contentHash]
    );
    return result.rows.length > 0;
  }
  
  private async updateTickerTracking(ticker: string, analysis: AIAnalysis): Promise<void> {
    console.log(`  📊 Tracking ${ticker} (${analysis.sentiment})`);
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
  
  private generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new IntelligentDigestService();
