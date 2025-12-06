import { pool } from "../db/index.js";
// src/services/edgarService.ts - DEBUG VERSION
import { Pool } from 'pg';
import Anthropic from '@anthropic-ai/sdk';


const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface EdgarFiling {
  cik: string;
  companyName: string;
  formType: string;
  filingDate: string;
  filingUrl: string;
  description: string;
}

class EdgarService {
  
  async ingestFilings(): Promise<{ success: boolean; count: number; message: string }> {
    console.log('📋 Fetching SEC EDGAR filings...');
    
    try {
      const ipoFilings = await this.fetchFilings('S-1');
      const spacFilings = await this.fetchFilings('8-K');
      
      console.log(`  ✓ Found ${ipoFilings.length} IPO filings`);
      console.log(`  ✓ Found ${spacFilings.length} potential SPAC filings`);
      
      // If no filings found, use fallback
      if (ipoFilings.length === 0 && spacFilings.length === 0) {
        console.log('  ⚠️ No filings from SEC, using fallback data');
        await this.seedFallbackData();
        return {
          success: true,
          count: 3,
          message: 'Using seed data (SEC unavailable)'
        };
      }
      
      let stored = 0;
      
      for (const filing of ipoFilings) {
        const processed = await this.processFiling(filing, 'IPO');
        if (processed) stored++;
      }
      
      for (const filing of spacFilings) {
        const isSPAC = await this.isSPACMerger(filing);
        if (isSPAC) {
          const processed = await this.processFiling(filing, 'SPAC_MERGER');
          if (processed) stored++;
        }
      }
      
      console.log(`  ✓ Stored ${stored} new opportunities`);
      
      return {
        success: true,
        count: stored,
        message: `Ingested ${stored} opportunities`
      };
      
    } catch (error: any) {
      console.error('❌ SEC ingestion failed:', error.message);
      // Use fallback on error
      await this.seedFallbackData();
      return { 
        success: true, 
        count: 3, 
        message: 'Using seed data due to error' 
      };
    }
  }

  private async fetchFilings(formType: string): Promise<EdgarFiling[]> {
    try {
      // Try RSS feed first
      const rssUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=${formType}&company=&dateb=&owner=exclude&start=0&count=40&output=atom`;
      
      console.log(`  → Fetching ${formType} from SEC...`);
      
      const response = await fetch(rssUrl, {
        headers: {
          'User-Agent': 'MarketAI johnny@jeeniemedia.com',
          'Accept': 'application/atom+xml,application/xml,text/xml,*/*'
        }
      });

      if (!response.ok) {
        console.log(`  ✗ SEC returned ${response.status}`);
        return [];
      }

      const text = await response.text();
      console.log(`  ✓ Got ${text.length} bytes from SEC`);
      
      // Debug: log first 500 chars
      if (process.env.NODE_ENV === 'development') {
        console.log(`  Preview: ${text.substring(0, 500)}`);
      }
      
      const filings = this.parseEdgarXML(text, formType);
      console.log(`  ✓ Parsed ${filings.length} ${formType} filings`);
      
      return filings;
      
    } catch (error: any) {
      console.error(`  ✗ Failed to fetch ${formType}:`, error.message);
      return [];
    }
  }

  private parseEdgarXML(xml: string, formType: string): EdgarFiling[] {
    const filings: EdgarFiling[] = [];
    
    // Try multiple parsing strategies
    
    // Strategy 1: Atom feed
    let entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    let matches = Array.from(xml.matchAll(entryRegex));
    
    if (matches.length === 0) {
      // Strategy 2: RSS items
      entryRegex = /<item>([\s\S]*?)<\/item>/gi;
      matches = Array.from(xml.matchAll(entryRegex));
    }
    
    console.log(`  → Found ${matches.length} entries in XML`);
    
    for (const match of matches) {
      const entry = match[1];
      
      // Extract fields with multiple fallbacks
      const title = 
        entry.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] ||
        entry.match(/<name[^>]*>(.*?)<\/name>/i)?.[1] ||
        '';
      
      const link = 
        entry.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] ||
        entry.match(/<link[^>]*>(.*?)<\/link>/i)?.[1] ||
        '';
      
      const date = 
        entry.match(/<updated[^>]*>(.*?)<\/updated>/i)?.[1] ||
        entry.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i)?.[1] ||
        entry.match(/<filing-date[^>]*>(.*?)<\/filing-date>/i)?.[1] ||
        new Date().toISOString();
      
      // Clean title and extract company
      const cleanTitle = title.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      const companyMatch = cleanTitle.match(/^(.*?)\s*[\(\[]/);
      const cikMatch = cleanTitle.match(/CIK[:\s]*(\d+)/i);
      
      if (link && (companyMatch || cleanTitle)) {
        filings.push({
          cik: cikMatch?.[1] || '',
          companyName: (companyMatch?.[1] || cleanTitle).trim().substring(0, 200),
          formType,
          filingDate: date.split('T')[0],
          filingUrl: link.startsWith('http') ? link : `https://www.sec.gov${link}`,
          description: cleanTitle
        });
      }
    }
    
    return filings.slice(0, 10);
  }

  private async isSPACMerger(filing: EdgarFiling): Promise<boolean> {
    const keywords = ['acquisition', 'merger', 'combination', 'agreement', 'target'];
    const text = `${filing.companyName} ${filing.description}`.toLowerCase();
    return keywords.some(k => text.includes(k));
  }

  private async processFiling(filing: EdgarFiling, type: 'IPO' | 'SPAC_MERGER'): Promise<boolean> {
    try {
      const existing = await pool.query(
        `SELECT id FROM opportunities 
         WHERE company_name = $1 AND filing_date = $2`,
        [filing.companyName, filing.filingDate]
      );
      
      if (existing.rows.length > 0) return false;
      
      const intelligence = await this.gatherIntelligence(filing.companyName);
      const analysis = await this.comprehensiveAnalysis(filing, type, intelligence);
      
      await pool.query(`
        INSERT INTO opportunities (
          ticker, company_name, opportunity_type, filing_type, filing_date, filing_url,
          ai_summary, ai_investment_thesis, ai_bull_case, ai_bear_case,
          ai_risk_factors, ai_catalysts, opportunity_score, risk_level, confidence,
          market_conditions, sector_analysis, competitive_landscape
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13, $14, $15, $16, $17, $18)
      `, [
        analysis.ticker,
        filing.companyName,
        type,
        filing.formType,
        filing.filingDate,
        filing.filingUrl,
        analysis.summary,
        analysis.investmentThesis,
        analysis.bullCase,
        analysis.bearCase,
        JSON.stringify(Array.isArray(analysis.riskFactors) ? analysis.riskFactors : ['Analysis pending']),
        JSON.stringify(Array.isArray(analysis.catalysts) ? analysis.catalysts : ['Analysis pending']),
        analysis.score,
        analysis.riskLevel,
        analysis.confidence,
        analysis.marketConditions,
        analysis.sectorAnalysis,
        analysis.competitiveLandscape
      ]);
      
      console.log(`  ✓ Analyzed ${type}: ${filing.companyName} (Score: ${analysis.score})`);
      return true;
      
    } catch (error) {
      console.error('Failed to process:', error);
      return false;
    }
  }

  private async gatherIntelligence(companyName: string) {
    try {
      const newsQuery = await pool.query(`
        SELECT ai_summary, ai_sentiment 
        FROM digest_entries
        WHERE raw_data::text ILIKE $1
        ORDER BY event_date DESC
        LIMIT 5
      `, [`%${companyName}%`]);
      
      const threadsQuery = await pool.query(`
        SELECT thread_name, ai_insight
        FROM intelligence_threads
        WHERE status = 'ACTIVE'
        LIMIT 10
      `);
      
      const calendarQuery = await pool.query(`
        SELECT event_name, importance
        FROM economic_events
        WHERE scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
          AND importance = 'high'
        LIMIT 5
      `);
      
      return {
        news: newsQuery.rows,
        threads: threadsQuery.rows,
        calendar: calendarQuery.rows
      };
    } catch (error) {
      return { news: [], threads: [], calendar: [] };
    }
  }

  private async comprehensiveAnalysis(filing: EdgarFiling, type: string, intelligence: any) {
    const prompt = `Analyze this ${type} opportunity:

Company: ${filing.companyName}
Filing: ${filing.formType} on ${filing.filingDate}

Market Context:
- Recent news: ${intelligence.news.map((n: any) => n.ai_summary).slice(0, 3).join('; ') || 'None'}
- Market themes: ${intelligence.threads.map((t: any) => t.thread_name).slice(0, 3).join('; ') || 'None'}

Provide JSON with:
{
  "ticker": "SYMBOL or null",
  "summary": "2-3 sentence overview",
  "investmentThesis": "Investment thesis paragraph",
  "bullCase": "Bull case paragraph",
  "bearCase": "Bear case paragraph",
  "riskFactors": ["risk1", "risk2", "risk3"],
  "catalysts": ["catalyst1", "catalyst2", "catalyst3"],
  "marketConditions": "Market environment",
  "sectorAnalysis": "Sector trends",
  "competitiveLandscape": "Competition",
  "score": 75,
  "riskLevel": "MEDIUM",
  "confidence": 80
}`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
      
    } catch (error) {
      return {
        ticker: null,
        summary: `${type} for ${filing.companyName}`,
        investmentThesis: 'Analysis pending',
        bullCase: 'Analysis pending',
        bearCase: 'Analysis pending',
        riskFactors: ['Analysis pending'],
        catalysts: ['Analysis pending'],
        marketConditions: 'Analysis pending',
        sectorAnalysis: 'Analysis pending',
        competitiveLandscape: 'Analysis pending',
        score: 50,
        riskLevel: 'MEDIUM',
        confidence: 50
      };
    }
  }

  private async seedFallbackData() {
    const opportunities = [
      {
        ticker: 'RDDT',
        company: 'Reddit Inc',
        type: 'IPO',
        summary: 'Social media platform with 500M+ users, AI licensing deals',
        score: 78
      },
      {
        ticker: 'ARM',
        company: 'Arm Holdings',
        type: 'IPO',
        summary: 'Semiconductor IP leader, 99% mobile market share, expanding to AI',
        score: 82
      },
      {
        ticker: 'STRM',
        company: 'Streamline Health',
        type: 'SPAC_MERGER',
        summary: 'Healthcare IT, AI-powered revenue cycle management',
        score: 72
      }
    ];

    for (const opp of opportunities) {
      try {
        await pool.query(`
          INSERT INTO opportunities (
            ticker, company_name, opportunity_type, filing_type, filing_date, filing_url,
            ai_summary, opportunity_score, risk_level, confidence
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT DO NOTHING
        `, [
          opp.ticker,
          opp.company,
          opp.type,
          opp.type === 'IPO' ? 'S-1' : '8-K',
          '2024-11-01',
          'https://www.sec.gov',
          opp.summary,
          opp.score,
          'MEDIUM',
          85
        ]);
      } catch (e) {
        // Ignore duplicates
      }
    }
  }

  async getOpportunitySummary() {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE opportunity_type = 'IPO') as ipo_count,
          COUNT(*) FILTER (WHERE opportunity_type = 'SPAC_MERGER') as spac_count,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as recent_count
        FROM opportunities
      `);
      
      return result.rows[0] || { ipo_count: 0, spac_count: 0, recent_count: 0 };
    } catch (error) {
      console.error('Summary error:', error);
      return { ipo_count: 0, spac_count: 0, recent_count: 0 };
    }
  }

  async getRecentOpportunities(limit: number = 20) {
    try {
      const result = await pool.query(`
        SELECT 
          id, ticker, company_name, opportunity_type, filing_date, filing_url,
          ai_summary, opportunity_score, risk_level, confidence,
          ai_bull_case, ai_bear_case, created_at
        FROM opportunities
        ORDER BY created_at DESC
        LIMIT $1
      `, [limit]);
      
      return result.rows;
    } catch (error) {
      console.error('Get opportunities error:', error);
      return [];
    }
  }
}

export default new EdgarService();
