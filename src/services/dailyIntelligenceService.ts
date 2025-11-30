// backend/src/services/dailyIntelligenceService.ts
// Daily Intelligence Reports - AI-generated summaries of digest data

import Anthropic from '@anthropic-ai/sdk';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface IntelligenceReport {
  date: Date;
  summary: string;
  topStories: any[];
  marketMovers: any[];
  geopoliticalAlerts: any[];
  economicIndicators: any[];
  cryptoTrends: any[];
  recommendations: string[];
}

class DailyIntelligenceService {
  
  /**
   * Generate daily intelligence report
   */
  async generateDailyReport(): Promise<IntelligenceReport> {
    console.log('📊 Generating Daily Intelligence Report...');
    
    const date = new Date();
    
    // Get last 24 hours of high-priority entries
    const entries = await this.getRecentHighPriorityEntries();
    console.log(`  ✓ Found ${entries.length} high-priority entries from last 24 hours`);
    
    // Categorize entries
    const categorized = this.categorizeEntries(entries);
    
    // Generate AI summary
    const aiSummary = await this.generateAISummary(categorized);
    console.log(`  ✓ AI summary generated`);
    
    // Build report
    const report: IntelligenceReport = {
      date,
      summary: aiSummary.executiveSummary,
      topStories: categorized.topStories,
      marketMovers: categorized.marketMovers,
      geopoliticalAlerts: categorized.geopolitical,
      economicIndicators: categorized.economic,
      cryptoTrends: categorized.crypto,
      recommendations: aiSummary.recommendations
    };
    
    // Store report
    await this.storeReport(report);
    console.log(`  ✓ Report stored`);
    
    return report;
  }
  
  /**
   * Get recent high-priority entries (last 24 hours, relevance >= 70)
   */
  private async getRecentHighPriorityEntries() {
    const result = await pool.query(`
      SELECT 
        source_type,
        source_name,
        ai_summary,
        ai_relevance_score,
        ai_sentiment,
        ai_entities_tickers,
        ai_tags,
        event_date,
        raw_data
      FROM digest_entries
      WHERE event_date >= NOW() - INTERVAL '24 hours'
        AND ai_relevance_score >= 70
      ORDER BY ai_relevance_score DESC, event_date DESC
      LIMIT 100
    `);
    
    return result.rows;
  }
  
  /**
   * Categorize entries by type and importance
   */
  private categorizeEntries(entries: any[]) {
    const topStories = entries
      .filter(e => ['news', 'earnings_ma'].includes(e.source_type))
      .slice(0, 10);
    
    const marketMovers = entries
      .filter(e => e.ai_entities_tickers && e.ai_entities_tickers.length > 0)
      .slice(0, 10);
    
    const geopolitical = entries
      .filter(e => e.source_type === 'geopolitical')
      .slice(0, 5);
    
    const economic = entries
      .filter(e => e.source_type === 'economic')
      .slice(0, 5);
    
    const crypto = entries
      .filter(e => e.source_type === 'crypto')
      .slice(0, 10);
    
    return {
      topStories,
      marketMovers,
      geopolitical,
      economic,
      crypto,
      all: entries
    };
  }
  
  /**
   * Generate AI summary using Claude
   */
  private async generateAISummary(categorized: any) {
    const prompt = this.buildPrompt(categorized);
    
    try {
      const message = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
      
      const responseText = message.content[0].type === 'text' 
        ? message.content[0].text 
        : '';
      
      // Parse response (expecting JSON)
      const parsed = JSON.parse(responseText);
      
      return {
        executiveSummary: parsed.executiveSummary || '',
        recommendations: parsed.recommendations || []
      };
      
    } catch (error) {
      console.error('AI summary generation failed:', error);
      
      // Fallback to basic summary
      return {
        executiveSummary: `Daily Intelligence Report for ${new Date().toLocaleDateString()}. ${categorized.all.length} high-priority events detected across markets, geopolitics, and crypto.`,
        recommendations: [
          'Monitor high-relevance entries in digest',
          'Review geopolitical developments',
          'Track market-moving events'
        ]
      };
    }
  }
  
  /**
   * Build prompt for Claude
   */
  private buildPrompt(categorized: any): string {
    return `You are a senior intelligence analyst preparing a daily briefing for institutional investors. Analyze the following intelligence data from the last 24 hours and create a concise executive summary.

**Top Stories (${categorized.topStories.length}):**
${categorized.topStories.map((e: any) => `- ${e.ai_summary} (Relevance: ${e.ai_relevance_score})`).join('\n')}

**Geopolitical Events (${categorized.geopolitical.length}):**
${categorized.geopolitical.map((e: any) => `- ${e.ai_summary} (${e.source_name})`).join('\n')}

**Economic Indicators (${categorized.economic.length}):**
${categorized.economic.map((e: any) => `- ${e.ai_summary}`).join('\n')}

**Market Movers (${categorized.marketMovers.length}):**
${categorized.marketMovers.map((e: any) => `- ${e.ai_summary} [${e.ai_entities_tickers?.join(', ')}]`).join('\n')}

**Crypto Trends (${categorized.crypto.length}):**
${categorized.crypto.map((e: any) => `- ${e.ai_summary}`).join('\n')}

Respond ONLY with valid JSON in this exact format:
{
  "executiveSummary": "2-3 paragraph executive summary highlighting the most critical developments and their market implications",
  "recommendations": [
    "Actionable recommendation 1",
    "Actionable recommendation 2",
    "Actionable recommendation 3"
  ]
}

CRITICAL: Your entire response must be ONLY valid JSON, nothing else. No markdown, no explanations, just the JSON object.`;
  }
  
  /**
   * Store report in database
   */
  private async storeReport(report: IntelligenceReport) {
    // Ensure all data is properly serializable
    const topStories = report.topStories.map(e => ({
      summary: e.ai_summary,
      relevance: e.ai_relevance_score,
      source: e.source_name,
      date: e.event_date
    }));
    
    const marketMovers = report.marketMovers.map(e => ({
      summary: e.ai_summary,
      tickers: e.ai_entities_tickers,
      relevance: e.ai_relevance_score,
      sentiment: e.ai_sentiment
    }));
    
    const geopolitical = report.geopoliticalAlerts.map(e => ({
      summary: e.ai_summary,
      source: e.source_name,
      relevance: e.ai_relevance_score
    }));
    
    const economic = report.economicIndicators.map(e => ({
      summary: e.ai_summary,
      source: e.source_name,
      date: e.event_date
    }));
    
    const crypto = report.cryptoTrends.map(e => ({
      summary: e.ai_summary,
      source: e.source_name,
      relevance: e.ai_relevance_score
    }));
    
    await pool.query(`
      INSERT INTO daily_intelligence_reports 
        (report_date, executive_summary, top_stories, market_movers, 
         geopolitical_alerts, economic_indicators, crypto_trends, recommendations)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (report_date) 
      DO UPDATE SET
        executive_summary = EXCLUDED.executive_summary,
        top_stories = EXCLUDED.top_stories,
        market_movers = EXCLUDED.market_movers,
        geopolitical_alerts = EXCLUDED.geopolitical_alerts,
        economic_indicators = EXCLUDED.economic_indicators,
        crypto_trends = EXCLUDED.crypto_trends,
        recommendations = EXCLUDED.recommendations,
        generated_at = NOW()
    `, [
      report.date.toISOString().split('T')[0], // Date only
      report.summary,
      JSON.stringify(topStories),
      JSON.stringify(marketMovers),
      JSON.stringify(geopolitical),
      JSON.stringify(economic),
      JSON.stringify(crypto),
      JSON.stringify(report.recommendations)
    ]);
  }
  
  /**
   * Get latest report
   */
  async getLatestReport() {
    const result = await pool.query(`
      SELECT * FROM daily_intelligence_reports
      ORDER BY report_date DESC
      LIMIT 1
    `);
    
    return result.rows[0] || null;
  }
  
  /**
   * Get report by date
   */
  async getReportByDate(date: string) {
    const result = await pool.query(`
      SELECT * FROM daily_intelligence_reports
      WHERE report_date = $1
    `, [date]);
    
    return result.rows[0] || null;
  }
  
  /**
   * Get last N reports
   */
  async getRecentReports(limit: number = 7) {
    const result = await pool.query(`
      SELECT * FROM daily_intelligence_reports
      ORDER BY report_date DESC
      LIMIT $1
    `, [limit]);
    
    return result.rows;
  }
}

export default new DailyIntelligenceService();
