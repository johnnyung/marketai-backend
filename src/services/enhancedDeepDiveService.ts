import { pool } from "../db/index.js";
import Anthropic from '@anthropic-ai/sdk';
import { Pool } from 'pg';


const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface DeepDiveAnalysis {
  ticker: string;
  companyName: string;
  executiveSummary: string;
  businessModel: string;
  competitiveLandscape: string;
  financialAnalysis: string;
  riskAssessment: string;
  historicalPatterns: string;
  investmentThesis: string;
  bullCase: { title: string; points: any[] };
  bearCase: { title: string; points: any[] };
  catalysts: any;
  riskFactors: any;
  historicalComparisons: any[];
  competitiveMatrix: any[];
  recommendation: string;
  confidence: number;
  priceTarget: number | null;
  timeHorizon: string;
  generatedAt: Date;
}

class EnhancedDeepDiveService {
  
  async generateDeepDive(ticker: string): Promise<DeepDiveAnalysis> {
    console.log(`📊 Generating deep dive for ${ticker}...`);
    
    const cached = await this.getCachedDeepDive(ticker);
    if (cached) {
      console.log(`  ✓ Using cached deep dive for ${ticker}`);
      return cached;
    }
    
    console.log(`  ✓ No cache found, generating new analysis...`);
    
    try {
      const intelligence = await this.gatherIntelligence(ticker);
      const analysis = await this.generateComprehensiveAnalysis(ticker, intelligence);
      await this.cacheDeepDive(ticker, analysis);
      return analysis;
    } catch (error: any) {
      console.error(`❌ Deep dive failed for ${ticker}:`, error.message);
      return this.getFallbackAnalysis(ticker);
    }
  }

  private async getCachedDeepDive(ticker: string): Promise<DeepDiveAnalysis | null> {
    try {
      const result = await pool.query(`
        SELECT * FROM deep_dive_cache
        WHERE ticker = $1 AND created_date = CURRENT_DATE
        LIMIT 1
      `, [ticker.toUpperCase()]);
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      const analysisData = typeof row.analysis === 'string' ? JSON.parse(row.analysis) : row.analysis;
      
      return {
        ticker: row.ticker,
        companyName: row.company_name || ticker,
        ...analysisData,
        generatedAt: new Date(row.generated_at)
      };
    } catch (error) {
      return null;
    }
  }

  private async cacheDeepDive(ticker: string, analysis: DeepDiveAnalysis): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO deep_dive_cache (ticker, company_name, analysis, created_date)
        VALUES ($1, $2, $3, CURRENT_DATE)
        ON CONFLICT (ticker, created_date) DO UPDATE
        SET analysis = EXCLUDED.analysis
      `, [ticker.toUpperCase(), analysis.companyName, JSON.stringify(analysis)]);
    } catch (error) {}
  }

  private async gatherIntelligence(ticker: string) {
    const companyNames = [ticker]; // Simplified for robustness
    
    // FIXED SQL QUERY: Removed to_jsonb wrapper causing type mismatch
    // Uses array overlap operator && for text[] comparison if available, or unnest
    // For safety with potential schema variations, checking against 'tickers' column directly
    
    // Try to match against 'tickers' array column OR text match
    const entriesQuery = `
      SELECT source_name, ai_summary, ai_relevance_score, ai_sentiment, event_date
      FROM digest_entries
      WHERE event_date >= NOW() - INTERVAL '60 days'
        AND (
          $1 = ANY(tickers)
          OR ai_summary ILIKE '%' || $1 || '%'
        )
      ORDER BY ai_relevance_score DESC, event_date DESC
      LIMIT 100
    `;
    
    const entriesResult = await pool.query(entriesQuery, [ticker]);
    
    const threadsQuery = `
      SELECT thread_name, description, ai_insight
      FROM intelligence_threads
      WHERE status = 'ACTIVE'
        AND (
          affected_tickers::text ILIKE '%' || $1 || '%'
          OR ai_insight ILIKE '%' || $1 || '%'
        )
      LIMIT 20
    `;
    
    const threadsResult = await pool.query(threadsQuery, [ticker]);
    
    return {
      entries: entriesResult.rows,
      threads: threadsResult.rows
    };
  }

  private async generateComprehensiveAnalysis(ticker: string, intelligence: any): Promise<DeepDiveAnalysis> {
    const entriesContext = intelligence.entries.slice(0, 50).map((e: any) =>
      `[${e.ai_relevance_score}] ${e.source_name}: ${e.ai_summary}`
    ).join('\n');
    
    const prompt = `Analyze ${ticker}. 
    INTELLIGENCE: ${entriesContext.substring(0, 10000)}
    
    Return VALID JSON matching this structure exactly:
    {
      "companyName": "Name",
      "executiveSummary": "Summary...",
      "businessModel": "Model...",
      "competitiveLandscape": "Landscape...",
      "financialAnalysis": "Financials...",
      "riskAssessment": "Risks...",
      "historicalPatterns": "History...",
      "investmentThesis": "Thesis...",
      "bullCase": { "title": "Bull", "points": [{ "point": "P1", "explanation": "E1", "strength": "HIGH" }] },
      "bearCase": { "title": "Bear", "points": [{ "point": "P1", "explanation": "E1", "severity": "HIGH" }] },
      "catalysts": { "nearTerm": [], "mediumTerm": [], "longTerm": [] },
      "riskFactors": { "operational": [], "financial": [], "market": [], "regulatory": [] },
      "historicalComparisons": [],
      "competitiveMatrix": [],
      "recommendation": "BUY",
      "confidence": 85,
      "priceTarget": 100,
      "timeHorizon": "12m",
      "currentPrice": 0,
      "riskLevel": "MED"
    }`;

    try {
        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            messages: [{ role: 'user', content: prompt }]
        });
        const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
        const json = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
        
        return {
            ticker: ticker.toUpperCase(),
            ...json,
            generatedAt: new Date()
        };
    } catch (e) {
        return this.getFallbackAnalysis(ticker);
    }
  }

  private getFallbackAnalysis(ticker: string): DeepDiveAnalysis {
    return {
      ticker: ticker.toUpperCase(),
      companyName: ticker,
      executiveSummary: 'Analysis pending.',
      businessModel: 'Pending.',
      competitiveLandscape: 'Pending.',
      financialAnalysis: 'Pending.',
      riskAssessment: 'Pending.',
      historicalPatterns: 'Pending.',
      investmentThesis: 'Pending.',
      bullCase: { title: 'Pending', points: [] },
      bearCase: { title: 'Pending', points: [] },
      catalysts: { nearTerm: [], mediumTerm: [], longTerm: [] },
      riskFactors: { operational: [], financial: [], market: [], regulatory: [] },
      historicalComparisons: [],
      competitiveMatrix: [],
      recommendation: 'HOLD',
      confidence: 0,
      priceTarget: null,
      timeHorizon: 'Pending',
      generatedAt: new Date()
    };
  }
}

export default new EnhancedDeepDiveService();
