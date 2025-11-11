/**
 * AUTO TIP TRACKER ORCHESTRATOR
 * Automatically tracks ALL AI recommendations from every source
 * - Trading Signals (already tracked)
 * - Deep Dive recommendations
 * - Intelligence Threads high-confidence tickers
 * - Executive Summary top picks
 * - Pattern Watch opportunities
 */

import aiTipTrackerService from './aiTipTrackerService.js';
import pool from '../db/index.js';

class AutoTipTrackerOrchestrator {
  
  /**
   * Track all recommendations from Deep Dive analyses
   */
  async trackFromDeepDives() {
    console.log('📊 Auto-tracking tips from Deep Dive analyses...');
    
    try {
      const result = await pool.query(`
        SELECT 
          ticker,
          company_name,
          recommendation,
          analysis,
          confidence,
          created_date
        FROM deep_dive_cache
        WHERE recommendation IN ('STRONG BUY', 'BUY')
        AND created_date >= NOW() - INTERVAL '7 days'
        ORDER BY confidence DESC, created_date DESC
      `);
      
      let tracked = 0;
      for (const dive of result.rows) {
        const exists = await this.checkIfAlreadyTracked(dive.ticker, 'Deep Dive');
        if (exists) continue;
        
        try {
          const currentPrice = await this.getCurrentPrice(dive.ticker);
          if (!currentPrice) continue;
          
          await aiTipTrackerService.createPosition({
            ticker: dive.ticker,
            companyName: dive.company_name,
            recommendationType: dive.recommendation === 'STRONG BUY' ? 'BUY' : 'BUY',
            entryPrice: currentPrice,
            aiReasoning: `Deep Dive Analysis: ${dive.analysis.substring(0, 500)}...`,
            aiConfidence: dive.confidence,
            aiThesis: `AI recommendation from comprehensive deep dive analysis`,
            aiStrategy: 'Deep Dive',
            aiPredictionTimeframe: '3-6 months'
          });
          
          tracked++;
          console.log(`  ✅ Tracked ${dive.ticker} from Deep Dive (${dive.recommendation})`);
        } catch (error) {
          console.error(`  ❌ Failed to track ${dive.ticker}:`, error);
        }
      }
      
      console.log(`  ✓ Tracked ${tracked} new tips from Deep Dives`);
    } catch (error) {
      console.error('Error tracking from Deep Dives:', error);
    }
  }
  
  /**
   * Track high-confidence tickers from Intelligence Threads
   */
  async trackFromIntelligenceThreads() {
    console.log('🧵 Auto-tracking tips from Intelligence Threads...');
    
    try {
      const result = await pool.query(`
        SELECT 
          t.id,
          t.title,
          t.affected_tickers,
          t.ai_insight,
          t.ai_trading_implication,
          t.confidence_score,
          t.risk_level,
          t.created_at
        FROM intelligence_threads t
        WHERE t.status = 'ACTIVE'
        AND t.confidence_score >= 75
        AND t.ai_trading_implication ILIKE '%buy%'
        AND t.created_at >= NOW() - INTERVAL '7 days'
        ORDER BY t.confidence_score DESC
      `);
      
      let tracked = 0;
      for (const thread of result.rows) {
        // Parse affected_tickers JSON
        let tickers: string[] = [];
        try {
          if (typeof thread.affected_tickers === 'string') {
            tickers = JSON.parse(thread.affected_tickers);
          } else if (Array.isArray(thread.affected_tickers)) {
            tickers = thread.affected_tickers;
          }
        } catch (e) {
          continue;
        }
        
        // Track top 3 tickers from each high-confidence thread
        for (const ticker of tickers.slice(0, 3)) {
          const exists = await this.checkIfAlreadyTracked(ticker, 'Intelligence Thread');
          if (exists) continue;
          
          try {
            const currentPrice = await this.getCurrentPrice(ticker);
            if (!currentPrice) continue;
            
            await aiTipTrackerService.createPosition({
              ticker,
              companyName: ticker, // Will be enriched by tip tracker service
              recommendationType: 'BUY',
              entryPrice: currentPrice,
              aiReasoning: `Intelligence Thread: ${thread.title}. ${thread.ai_trading_implication}`,
              aiConfidence: thread.confidence_score,
              aiThesis: thread.ai_insight,
              aiStrategy: 'Intelligence Thread',
              aiPredictionTimeframe: '2-4 weeks'
            });
            
            tracked++;
            console.log(`  ✅ Tracked ${ticker} from Thread: ${thread.title}`);
          } catch (error) {
            console.error(`  ❌ Failed to track ${ticker}:`, error);
          }
        }
      }
      
      console.log(`  ✓ Tracked ${tracked} new tips from Intelligence Threads`);
    } catch (error) {
      console.error('Error tracking from Intelligence Threads:', error);
    }
  }
  
  /**
   * Track top picks from Executive Summary
   */
  async trackFromExecutiveSummary() {
    console.log('📈 Auto-tracking tips from Executive Summary...');
    
    try {
      const result = await pool.query(`
        SELECT 
          top_ai_picks
        FROM executive_summary
        WHERE created_at >= NOW() - INTERVAL '1 day'
        ORDER BY created_at DESC
        LIMIT 1
      `);
      
      if (result.rows.length === 0) return;
      
      const topPicks = result.rows[0].top_ai_picks;
      if (!topPicks || !Array.isArray(topPicks)) return;
      
      let tracked = 0;
      for (const pick of topPicks.slice(0, 5)) {
        const exists = await this.checkIfAlreadyTracked(pick.ticker, 'Executive Summary');
        if (exists) continue;
        
        try {
          const currentPrice = await this.getCurrentPrice(pick.ticker);
          if (!currentPrice) continue;
          
          await aiTipTrackerService.createPosition({
            ticker: pick.ticker,
            companyName: pick.company || pick.ticker,
            recommendationType: 'BUY',
            entryPrice: currentPrice,
            aiReasoning: `Executive Summary Top Pick: ${pick.reasoning}`,
            aiConfidence: pick.confidence || 80,
            aiThesis: pick.reasoning,
            aiStrategy: 'Executive Summary',
            aiPredictionTimeframe: '1-3 months'
          });
          
          tracked++;
          console.log(`  ✅ Tracked ${pick.ticker} from Executive Summary`);
        } catch (error) {
          console.error(`  ❌ Failed to track ${pick.ticker}:`, error);
        }
      }
      
      console.log(`  ✓ Tracked ${tracked} new tips from Executive Summary`);
    } catch (error) {
      console.error('Error tracking from Executive Summary:', error);
    }
  }
  
  /**
   * Track SHORT opportunities from Risk Monitor
   */
  async trackFromRiskMonitor() {
    console.log('🛡️ Auto-tracking SHORT opportunities from Risk Monitor...');
    
    try {
      const result = await pool.query(`
        SELECT 
          ticker,
          assessment,
          risk_score,
          top_risks,
          created_at
        FROM risk_assessments
        WHERE risk_score >= 80
        AND created_at >= NOW() - INTERVAL '7 days'
        ORDER BY risk_score DESC
      `);
      
      let tracked = 0;
      for (const risk of result.rows) {
        if (!risk.ticker) continue;
        
        const exists = await this.checkIfAlreadyTracked(risk.ticker, 'Risk Monitor SHORT');
        if (exists) continue;
        
        try {
          const currentPrice = await this.getCurrentPrice(risk.ticker);
          if (!currentPrice) continue;
          
          await aiTipTrackerService.createPosition({
            ticker: risk.ticker,
            companyName: risk.ticker,
            recommendationType: 'SHORT',
            entryPrice: currentPrice,
            aiReasoning: `Risk Monitor Alert: High risk score ${risk.score}. ${risk.assessment}`,
            aiConfidence: risk.risk_score,
            aiThesis: `Critical risk factors identified`,
            aiStrategy: 'Risk Monitor SHORT',
            aiPredictionTimeframe: '2-8 weeks'
          });
          
          tracked++;
          console.log(`  ✅ Tracked SHORT ${risk.ticker} from Risk Monitor`);
        } catch (error) {
          console.error(`  ❌ Failed to track SHORT ${risk.ticker}:`, error);
        }
      }
      
      console.log(`  ✓ Tracked ${tracked} SHORT positions from Risk Monitor`);
    } catch (error) {
      console.error('Error tracking from Risk Monitor:', error);
    }
  }
  
  /**
   * Master function to track from ALL sources
   */
  async trackAllSources() {
    console.log('🎯 AUTO TIP TRACKER: Starting comprehensive tracking...\n');
    
    const startTime = Date.now();
    
    await this.trackFromDeepDives();
    await this.trackFromIntelligenceThreads();
    await this.trackFromExecutiveSummary();
    await this.trackFromRiskMonitor();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Auto-tracking complete in ${duration}s`);
    
    // Update all positions with latest prices
    await aiTipTrackerService.updateAllPositions();
  }
  
  /**
   * Check if ticker is already being tracked from this source
   */
  private async checkIfAlreadyTracked(ticker: string, source: string): Promise<boolean> {
    const result = await pool.query(`
      SELECT id FROM ai_tip_tracker
      WHERE ticker = $1
      AND status = 'OPEN'
      AND ai_strategy = $2
      AND entry_date >= NOW() - INTERVAL '30 days'
      LIMIT 1
    `, [ticker.toUpperCase(), source]);
    
    return result.rows.length > 0;
  }
  
  /**
   * Get current price for ticker
   */
  private async getCurrentPrice(ticker: string): Promise<number | null> {
    try {
      const result = await pool.query(`
        SELECT current_price
        FROM ticker_prices
        WHERE ticker = $1
        ORDER BY updated_at DESC
        LIMIT 1
      `, [ticker.toUpperCase()]);
      
      if (result.rows.length > 0 && result.rows[0].current_price) {
        return parseFloat(result.rows[0].current_price);
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting price for ${ticker}:`, error);
      return null;
    }
  }
}

export default new AutoTipTrackerOrchestrator();
