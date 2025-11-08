// backend/src/services/intelligentDigestService.ts
// AI-Powered Data Ingestion & Smart Storage

import { Pool } from 'pg';
import crypto from 'crypto';
import secEdgarService from './secEdgarService.js';
import redditService from './redditService.js';
import technicalIndicatorsService from './technicalIndicatorsService.js';

interface DigestEntry {
  sourceType: string;
  sourceName: string;
  rawData: any;
  eventTimestamp: Date;
  contentHash: string;
}

interface AIAnalysis {
  relevanceScore: number; // 0-100
  summary: string; // 2-3 sentence summary
  tags: string[]; // ['bullish', 'insider buying', 'tech sector']
  entities: {
    tickers: string[];
    people: string[];
    companies: string[];
  };
  importance: 'critical' | 'high' | 'medium' | 'low';
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

class IntelligentDigestService {
  private pool: Pool;
  
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }
  
  /**
   * Main ingestion pipeline - called when user clicks "Refresh" on Digest page
   */
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
      // STEP 1: Collect raw data from all sources
      console.log('📡 Step 1: Collecting data from all sources...');
      const rawEntries = await this.collectAllData();
      collected = rawEntries.length;
      console.log(`✅ Collected ${collected} raw entries\n`);
      
      // STEP 2: Process each entry with AI
      console.log('🤖 Step 2: AI analyzing and categorizing...');
      for (const entry of rawEntries) {
        try {
          // Check if already exists
          if (await this.isDuplicate(entry.contentHash)) {
            duplicates++;
            continue;
          }
          
          // AI analyzes the entry
          const analysis = await this.analyzeWithAI(entry);
          
          // Store if relevance score is high enough
          if (analysis.relevanceScore >= 40) {
            await this.storeEntry(entry, analysis);
            stored++;
            
            // Update ticker tracking
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
      
      // STEP 3: Cleanup old data
      console.log('\n🧹 Step 3: Cleaning up expired data...');
      await this.cleanupExpiredData();
      
      // STEP 4: Record statistics
      const stats = await this.recordStatistics(collected, stored, duplicates);
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n✅ === DIGEST INGESTION COMPLETE (${duration}s) ===`);
      console.log(`   Collected: ${collected}`);
      console.log(`   Stored: ${stored}`);
      console.log(`   Duplicates: ${duplicates}`);
      console.log(`   Processing rate: ${(stored / parsed(duration) * 60).toFixed(0)} entries/min\n`);
      
      return { collected, processed: collected, stored, duplicates, stats };
      
    } catch (error) {
      console.error('❌ Digest ingestion failed:', error);
      throw error;
    }
  }
  
  /**
   * Collect data from all available sources
   */
  private async collectAllData(): Promise<DigestEntry[]> {
    const entries: DigestEntry[] = [];
    
    // Source 1: SEC EDGAR Insider Trades
    try {
      const insiderTrades = await secEdgarService.getRecentInsiderTrades(30);
      entries.push(...insiderTrades.map(trade => ({
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
    
    // Source 2: Reddit Social Sentiment
    try {
      const socialData = await redditService.getWallStreetBetsSentiment();
      entries.push(...socialData.map(mention => ({
        sourceType: 'social',
        sourceName: 'Reddit',
        rawData: mention,
        eventTimestamp: new Date(),
        contentHash: this.generateHash(`reddit-${mention.ticker}-${new Date().toDateString()}`)
      })));
      console.log(`  ✓ Reddit: ${socialData.length} ticker mentions`);
    } catch (error) {
      console.error('  ✗ Reddit failed:', error);
    }
    
    // Source 3: Technical Indicators (for top tickers only)
    try {
      // Get top 5 most mentioned tickers from social data
      const topTickers = await this.getTopTickers(5);
      for (const ticker of topTickers) {
        const technical = await technicalIndicatorsService.getTechnicalIndicators(ticker);
        if (technical) {
          entries.push({
            sourceType: 'technical',
            sourceName: 'Alpha Vantage',
            rawData: technical,
            eventTimestamp: new Date(),
            contentHash: this.generateHash(`technical-${ticker}-${new Date().toDateString()}`)
          });
        }
        await this.sleep(13000); // Respect rate limits
      }
      console.log(`  ✓ Technical: ${topTickers.length} tickers analyzed`);
    } catch (error) {
      console.error('  ✗ Technical analysis failed:', error);
    }
    
    // TODO: Add more sources:
    // - News API
    // - Economic calendar
    // - Earnings calendar
    // - etc.
    
    return entries;
  }
  
  /**
   * AI analyzes a single digest entry
   */
  private async analyzeWithAI(entry: DigestEntry): Promise<AIAnalysis> {
    // For now, use rule-based analysis
    // TODO: Call Claude API for full AI analysis
    
    const analysis: AIAnalysis = {
      relevanceScore: 50,
      summary: '',
      tags: [],
      entities: { tickers: [], people: [], companies: [] },
      importance: 'medium',
      sentiment: 'neutral'
    };
    
    // Analyze based on source type
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
    
    else if (entry.sourceType === 'social') {
      const mention = entry.rawData;
      analysis.relevanceScore = Math.min(100, mention.mentions * 5);
      analysis.summary = `${mention.ticker} trending on Reddit with ${mention.mentions} mentions, ${mention.sentiment > 0 ? 'bullish' : 'bearish'} sentiment`;
      analysis.tags = ['social', 'trending', mention.sentiment > 0 ? 'bullish' : 'bearish'];
      analysis.entities.tickers = [mention.ticker];
      analysis.importance = mention.mentions > 1000 ? 'high' : 'medium';
      analysis.sentiment = mention.sentiment > 0 ? 'bullish' : 'bearish';
    }
    
    else if (entry.sourceType === 'technical') {
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
  
  /**
   * Store entry in database
   */
  private async storeEntry(entry: DigestEntry, analysis: AIAnalysis): Promise<void> {
    const expiresAt = this.calculateExpiration(entry.sourceType);
    
    await this.pool.query(`
      INSERT INTO digest_entries (
        source_type, source_name, raw_data,
        relevance_score, ai_summary, ai_tags, entities,
        importance, sentiment,
        event_timestamp, expires_at, content_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (content_hash) DO NOTHING
    `, [
      entry.sourceType,
      entry.sourceName,
      JSON.stringify(entry.rawData),
      analysis.relevanceScore,
      analysis.summary,
      analysis.tags,
      JSON.stringify(analysis.entities),
      analysis.importance,
      analysis.sentiment,
      entry.eventTimestamp,
      expiresAt,
      entry.contentHash
    ]);
  }
  
  /**
   * Check if entry already exists
   */
  private async isDuplicate(contentHash: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT id FROM digest_entries WHERE content_hash = $1',
      [contentHash]
    );
    return result.rows.length > 0;
  }
  
  /**
   * Update ticker tracking
   */
  private async updateTickerTracking(ticker: string, analysis: AIAnalysis): Promise<void> {
    await this.pool.query(`
      INSERT INTO tracked_tickers (ticker, mention_count, last_mentioned, ai_sentiment, attention_score)
      VALUES ($1, 1, NOW(), $2, $3)
      ON CONFLICT (ticker) DO UPDATE SET
        mention_count = tracked_tickers.mention_count + 1,
        last_mentioned = NOW(),
        ai_sentiment = $2,
        attention_score = GREATEST(tracked_tickers.attention_score, $3)
    `, [ticker, analysis.sentiment, analysis.relevanceScore]);
  }
  
  /**
   * Get top tickers for technical analysis
   */
  private async getTopTickers(limit: number): Promise<string[]> {
    const result = await this.pool.query(`
      SELECT ticker FROM tracked_tickers
      ORDER BY attention_score DESC, mention_count DESC
      LIMIT $1
    `, [limit]);
    
    return result.rows.map(row => row.ticker);
  }
  
  /**
   * Calculate expiration date based on retention policy
   */
  private calculateExpiration(sourceType: string): Date {
    const retentionDays: Record<string, number> = {
      'insider_trade': 90,
      'social': 7,
      'news': 30,
      'technical': 14,
      'economic': 180,
      'earnings': 90
    };
    
    const days = retentionDays[sourceType] || 30;
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    return expires;
  }
  
  /**
   * Cleanup expired data
   */
  private async cleanupExpiredData(): Promise<void> {
    const result = await this.pool.query(`
      DELETE FROM digest_entries
      WHERE expires_at < NOW()
      RETURNING id
    `);
    console.log(`  ✓ Removed ${result.rowCount} expired entries`);
  }
  
  /**
   * Record statistics
   */
  private async recordStatistics(collected: number, stored: number, duplicates: number): Promise<any> {
    const stats = await this.pool.query(`
      INSERT INTO digest_statistics (
        date, entries_collected, entries_processed, duplicates_filtered
      ) VALUES (CURRENT_DATE, $1, $2, $3)
      ON CONFLICT (date) DO UPDATE SET
        entries_collected = digest_statistics.entries_collected + $1,
        entries_processed = digest_statistics.entries_processed + $2,
        duplicates_filtered = digest_statistics.duplicates_filtered + $3
      RETURNING *
    `, [collected, stored, duplicates]);
    
    return stats.rows[0];
  }
  
  /**
   * Get digest summary for UI
   */
  async getDigestSummary(): Promise<any> {
    const [total, byType, trending] = await Promise.all([
      this.pool.query('SELECT COUNT(*) as count FROM digest_entries WHERE expires_at > NOW()'),
      this.pool.query(`
        SELECT source_type, COUNT(*) as count, AVG(relevance_score) as avg_score
        FROM digest_entries
        WHERE expires_at > NOW()
        GROUP BY source_type
        ORDER BY count DESC
      `),
      this.pool.query(`
        SELECT ticker, mention_count, ai_sentiment, attention_score
        FROM tracked_tickers
        ORDER BY attention_score DESC
        LIMIT 10
      `)
    ]);
    
    return {
      totalEntries: parseInt(total.rows[0].count),
      byType: byType.rows,
      trendingTickers: trending.rows
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
