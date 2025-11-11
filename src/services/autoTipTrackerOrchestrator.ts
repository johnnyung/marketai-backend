/**
 * AUTO TIP TRACKER ORCHESTRATOR - SIMPLIFIED
 * Tracks tips from available sources only
 */

import aiTipTrackerService from './aiTipTrackerService.js';
import pool from '../db/index.js';
import axios from 'axios';

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY;

class AutoTipTrackerOrchestrator {
  
  async trackFromDeepDives() {
    console.log('📊 Auto-tracking tips from Deep Dive analyses...');
    
    try {
      const result = await pool.query(`
        SELECT ticker, company_name, recommendation, analysis, confidence, created_date
        FROM deep_dive_cache
        WHERE recommendation IN ('STRONG BUY', 'BUY')
        AND created_date >= NOW() - INTERVAL '7 days'
        ORDER BY confidence DESC, created_date DESC
        LIMIT 10
      `);
      
      let tracked = 0;
      for (const dive of result.rows) {
        const exists = await this.checkIfAlreadyTracked(dive.ticker, 'Deep Dive');
        if (exists) continue;
        
        try {
          const currentPrice = await this.getCurrentPriceFromAPI(dive.ticker);
          if (!currentPrice) {
            console.log(`  ⚠️  No price for ${dive.ticker}, skipping`);
            continue;
          }
          
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
          console.log(`  ✅ Tracked ${dive.ticker} from Deep Dive`);
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
        SELECT t.id, t.title, t.affected_tickers, t.ai_insight, 
               t.ai_trading_implication, t.confidence_score, t.created_at
        FROM intelligence_threads t
        WHERE t.status = 'ACTIVE'
        AND t.confidence_score >= 75
        AND t.created_at >= NOW() - INTERVAL '7 days'
        ORDER BY t.confidence_score DESC
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
        
        for (const ticker of tickers.slice(0, 2)) {
          const exists = await this.checkIfAlreadyTracked(ticker, 'Intelligence Thread');
          if (exists) continue;
          
          try {
            const currentPrice = await this.getCurrentPriceFromAPI(ticker);
            if (!currentPrice) continue;
            
            await aiTipTrackerService.createPosition({
              ticker,
              companyName: ticker,
              recommendationType: 'BUY',
              entryPrice: currentPrice,
              aiReasoning: `Thread: ${thread.title}. ${thread.ai_trading_implication || ''}`,
              aiConfidence: thread.confidence_score,
              aiThesis: thread.ai_insight || 'Intelligence thread opportunity',
              aiStrategy: 'Intelligence Thread',
              aiPredictionTimeframe: '2-4 weeks'
            });
            
            tracked++;
            console.log(`  ✅ Tracked ${ticker} from Thread: ${thread.title}`);
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
  
  async trackAllSources() {
    console.log('🎯 AUTO TIP TRACKER: Starting comprehensive tracking...\n');
    
    const startTime = Date.now();
    
    await this.trackFromDeepDives();
    await this.trackFromIntelligenceThreads();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Auto-tracking complete in ${duration}s`);
    
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
  
  private async getCurrentPriceFromAPI(ticker: string): Promise<number | null> {
    if (!ALPHA_VANTAGE_KEY) {
      console.log('  ⚠️  No Alpha Vantage API key configured');
      return null;
    }
    
    try {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHA_VANTAGE_KEY}`;
      const response = await axios.get(url, { timeout: 5000 });
      
      const quote = response.data['Global Quote'];
      if (quote && quote['05. price']) {
        return parseFloat(quote['05. price']);
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
}

export default new AutoTipTrackerOrchestrator();
