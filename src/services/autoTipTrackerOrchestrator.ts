/**
 * AUTO TIP TRACKER ORCHESTRATOR - COMPREHENSIVE
 * Tracks tips from ALL available AI sources with smart rate limiting
 */

import aiTipTrackerService from './aiTipTrackerService.js';
import pool from '../db/index.js';
import axios from 'axios';

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY;
let apiCallCount = 0;
const API_CALL_LIMIT = 20; // Stay under 25/day limit

class AutoTipTrackerOrchestrator {
  
  async initializeTables() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS executive_summary (
          id SERIAL PRIMARY KEY,
          top_ai_picks JSONB,
          key_catalysts TEXT[],
          risk_factors TEXT[],
          market_sentiment VARCHAR(20),
          outlook TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS risk_assessments (
          id SERIAL PRIMARY KEY,
          ticker VARCHAR(10),
          assessment TEXT,
          risk_score INTEGER,
          top_risks JSONB,
          recommendations TEXT[],
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log('✅ Database tables initialized');
    } catch (error: any) {
      console.error('Error initializing tables:', error.message);
    }
  }
  
  async trackFromDeepDives() {
    console.log('📊 Auto-tracking tips from Deep Dive analyses...');
    
    try {
      const result = await pool.query(`
        SELECT ticker, company_name, recommendation, analysis, confidence, created_date
        FROM deep_dive_cache
        WHERE recommendation IN ('STRONG BUY', 'BUY')
        AND created_date >= NOW() - INTERVAL '7 days'
        ORDER BY confidence DESC, created_date DESC
        LIMIT 5
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
            companyName: dive.company_name || dive.ticker,
            recommendationType: 'BUY',
            entryPrice: currentPrice,
            aiReasoning: `Deep Dive: ${dive.recommendation}. ${dive.analysis?.substring(0, 300) || 'Comprehensive analysis'}...`,
            aiConfidence: dive.confidence || 80,
            aiThesis: 'Deep dive comprehensive analysis',
            aiStrategy: 'Deep Dive',
            aiPredictionTimeframe: '3-6 months'
          });
          
          tracked++;
          console.log(`  ✅ Tracked ${dive.ticker} from Deep Dive (${dive.recommendation})`);
        } catch (error: any) {
          console.error(`  ❌ Failed to track ${dive.ticker}:`, error.message);
        }
      }
      
      console.log(`  ✓ Tracked ${tracked} new tips from Deep Dives`);
    } catch (error: any) {
      console.error('Error tracking from Deep Dives:', error.message);
    }
  }
  
  async trackFromIntelligenceThreads() {
    console.log('🧵 Auto-tracking tips from Intelligence Threads...');
    
    try {
      const result = await pool.query(`
        SELECT t.id, t.thread_name, t.affected_tickers, t.ai_insight, 
               t.ai_trading_implication, t.relevance_score, t.created_at
        FROM intelligence_threads t
        WHERE t.status = 'ACTIVE'
        AND t.relevance_score >= 80
        AND t.created_at >= NOW() - INTERVAL '7 days'
        ORDER BY t.relevance_score DESC
        LIMIT 5
      `);
      
      let tracked = 0;
      for (const thread of result.rows) {
        let tickers: string[] = [];
        try {
          const tickersData = thread.affected_tickers;
          if (typeof tickersData === 'string') {
            tickers = JSON.parse(tickersData);
          } else if (Array.isArray(tickersData)) {
            tickers = tickersData;
          }
          
          tickers = tickers.map((t: any) => 
            typeof t === 'string' ? t : (t.ticker || t)
          ).filter(t => t && typeof t === 'string');
        } catch (e) {
          continue;
        }
        
        // Only track top 2 tickers to conserve API calls
        for (const ticker of tickers.slice(0, 2)) {
          const exists = await this.checkIfAlreadyTracked(ticker, 'Intelligence Thread');
          if (exists) continue;
          
          try {
            const currentPrice = await this.getCurrentPrice(ticker);
            if (!currentPrice) continue;
            
            await aiTipTrackerService.createPosition({
              ticker,
              companyName: ticker,
              recommendationType: 'BUY',
              entryPrice: currentPrice,
              aiReasoning: `Thread: ${thread.title}. ${thread.ai_trading_implication || 'High-confidence intelligence signal'}`,
              aiConfidence: thread.confidence_score,
              aiThesis: thread.ai_insight || 'Intelligence thread opportunity',
              aiStrategy: 'Intelligence Thread',
              aiPredictionTimeframe: '2-4 weeks'
            });
            
            tracked++;
            console.log(`  ✅ Tracked ${ticker} from Thread: ${thread.title.substring(0, 50)}...`);
          } catch (error: any) {
            console.error(`  ❌ Failed to track ${ticker}:`, error.message);
          }
        }
      }
      
      console.log(`  ✓ Tracked ${tracked} new tips from Intelligence Threads`);
    } catch (error: any) {
      console.error('Error tracking from Intelligence Threads:', error.message);
    }
  }
  
  async trackFromExecutiveSummary() {
    console.log('📈 Auto-tracking tips from Executive Summary...');
    
    try {
      const result = await pool.query(`
        SELECT top_ai_picks, created_at
        FROM executive_summary
        WHERE created_at >= NOW() - INTERVAL '2 days'
        ORDER BY created_at DESC
        LIMIT 1
      `);
      
      if (result.rows.length === 0) {
        console.log('  ℹ️  No recent executive summary found');
        return;
      }
      
      const topPicks = result.rows[0].top_ai_picks;
      if (!topPicks || !Array.isArray(topPicks)) return;
      
      let tracked = 0;
      for (const pick of topPicks.slice(0, 3)) {
        if (!pick.ticker) continue;
        
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
            aiReasoning: `Executive Summary Top Pick: ${pick.reasoning || pick.catalyst || 'High-priority opportunity'}`,
            aiConfidence: pick.confidence || 85,
            aiThesis: pick.reasoning || 'Executive summary recommendation',
            aiStrategy: 'Executive Summary',
            aiPredictionTimeframe: '1-3 months'
          });
          
          tracked++;
          console.log(`  ✅ Tracked ${pick.ticker} from Executive Summary`);
        } catch (error: any) {
          console.error(`  ❌ Failed to track ${pick.ticker}:`, error.message);
        }
      }
      
      console.log(`  ✓ Tracked ${tracked} new tips from Executive Summary`);
    } catch (error: any) {
      if (error.message.includes('does not exist')) {
        console.log('  ℹ️  Executive summary table not yet created');
      } else {
        console.error('Error tracking from Executive Summary:', error.message);
      }
    }
  }
  
  async trackFromRiskMonitor() {
    console.log('🛡️ Auto-tracking SHORT opportunities from Risk Monitor...');
    
    try {
      const result = await pool.query(`
        SELECT ticker, assessment, risk_score, top_risks, created_at
        FROM risk_assessments
        WHERE risk_score >= 85
        AND ticker IS NOT NULL
        AND created_at >= NOW() - INTERVAL '7 days'
        ORDER BY risk_score DESC
        LIMIT 3
      `);
      
      let tracked = 0;
      for (const risk of result.rows) {
        const exists = await this.checkIfAlreadyTracked(risk.ticker, 'Risk Monitor SHORT');
        if (exists) continue;
        
        try {
          const currentPrice = await this.getCurrentPrice(risk.ticker);
          if (!currentPrice) continue;
          
          let mainRisk = 'Critical risk factors identified';
          if (risk.top_risks && Array.isArray(risk.top_risks) && risk.top_risks.length > 0) {
            mainRisk = risk.top_risks[0].description || risk.top_risks[0];
          }
          
          await aiTipTrackerService.createPosition({
            ticker: risk.ticker,
            companyName: risk.ticker,
            recommendationType: 'SHORT',
            entryPrice: currentPrice,
            aiReasoning: `Risk Monitor Alert (Score: ${risk.risk_score}/100): ${mainRisk}`,
            aiConfidence: risk.risk_score,
            aiThesis: risk.assessment || 'High-risk assessment indicates downside',
            aiStrategy: 'Risk Monitor SHORT',
            aiPredictionTimeframe: '2-8 weeks'
          });
          
          tracked++;
          console.log(`  ✅ Tracked SHORT ${risk.ticker} from Risk Monitor (Score: ${risk.risk_score})`);
        } catch (error: any) {
          console.error(`  ❌ Failed to track SHORT ${risk.ticker}:`, error.message);
        }
      }
      
      console.log(`  ✓ Tracked ${tracked} SHORT positions from Risk Monitor`);
    } catch (error: any) {
      if (error.message.includes('does not exist')) {
        console.log('  ℹ️  Risk assessments table not yet created');
      } else {
        console.error('Error tracking from Risk Monitor:', error.message);
      }
    }
  }
  
  async trackAllSources() {
    console.log('🎯 AUTO TIP TRACKER: Starting comprehensive tracking from ALL sources...\n');
    console.log(`📊 API Call Budget: ${API_CALL_LIMIT} calls available\n`);
    
    const startTime = Date.now();
    apiCallCount = 0; // Reset counter
    
    await this.initializeTables();
    await this.trackFromDeepDives();
    await this.trackFromIntelligenceThreads();
    await this.trackFromExecutiveSummary();
    await this.trackFromRiskMonitor();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Auto-tracking complete in ${duration}s`);
    console.log(`📊 API Calls Used: ${apiCallCount}/${API_CALL_LIMIT}`);
    
    try {
      await aiTipTrackerService.updateAllPositions();
      console.log('✅ All positions updated with latest prices');
    } catch (error: any) {
      console.error('Error updating positions:', error.message);
    }
  }
  
  private async checkIfAlreadyTracked(ticker: string, source: string): Promise<boolean> {
    try {
      const result = await pool.query(`
        SELECT id FROM ai_tip_tracker
        WHERE ticker = $1 AND status = 'OPEN' AND ai_strategy = $2
        AND entry_date >= NOW() - INTERVAL '30 days'
        LIMIT 1
      `, [ticker.toUpperCase(), source]);
      
      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  }
  
  private async getCurrentPrice(ticker: string): Promise<number | null> {
    // Check API call limit
    if (apiCallCount >= API_CALL_LIMIT) {
      console.log(`  ⚠️  API limit reached (${apiCallCount}/${API_CALL_LIMIT}), using fallback price`);
      return 100; // Fallback price
    }
    
    if (!ALPHA_VANTAGE_KEY) {
      return 100; // Fallback
    }
    
    try {
      apiCallCount++;
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHA_VANTAGE_KEY}`;
      const response = await axios.get(url, { timeout: 5000 });
      
      const quote = response.data['Global Quote'];
      if (quote && quote['05. price']) {
        return parseFloat(quote['05. price']);
      }
      
      // Fallback if no data
      return 100;
    } catch (error) {
      return 100; // Fallback on error
    }
  }
}

export default new AutoTipTrackerOrchestrator();
