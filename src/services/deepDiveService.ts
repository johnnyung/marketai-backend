import Anthropic from '@anthropic-ai/sdk';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

class DeepDiveService {
  async generateTickerDeepDive(ticker?: string) {
    return {
      ticker: ticker || 'SPY',
      company_name: 'Standard & Poors',
      analysis: 'Market analysis pending...',
      recommendation: 'HOLD',
      confidence: 50,
      generated_at: new Date()
    };
  }

  async generatePatternWatch() {
    return [];
  }

  async generateRiskMonitor() {
    const prompt = "Assess current market risks. Return JSON: { overall_risk_level: 'medium', risk_score: 50, top_risks: [], market_indicators: {}, recommendations: [] }";
    
    try {
      const message = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      });
      const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
      return JSON.parse(text.replace(/\n?/g, '').trim());
    } catch (e) {
      return { overall_risk_level: 'unknown', risk_score: 0 };
    }
  }

  async generatePoliticalIntelligence() {
    return { summary: "Data pending", key_developments: [] };
  }
  
  async getTodaysCachedAnalyses() { return []; }
  
  // Fixed: Added ticker argument to match route call
  async generateTickerPatterns(ticker: string) {
    return [{
      pattern_name: "Volatility Scan",
      description: `Pattern check for ${ticker}`,
      confidence: 50
    }];
  }
  
  // Fixed: Added ticker argument to match route call
  async generateTickerRisks(ticker: string) {
    return {
      ticker,
      risk_level: "medium",
      factors: []
    };
  }
}

export default new DeepDiveService();
