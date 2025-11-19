// src/services/unifiedIntelligenceEngine.ts
// Master Intelligence Engine - Integrates all data sources and AI analysis systems
// Combines: Political Alerts + Crypto Correlation + Historical Patterns + Market Data

import pool from '../db/index.js';
import cryptoStockCorrelationService from './cryptoStockCorrelation.js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

interface UnifiedAlert {
  id: string;
  alert_type: 'crypto_correlation' | 'political_investigation' | 'market_anomaly' | 'combined_signal';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  confidence: number;
  data_sources: string[];
  affected_tickers: Array<{
    ticker: string;
    impact_prediction: number;
    recommendation: string;
    correlation_strength: number;
  }>;
  historical_precedent?: any;
  action_items: string[];
  timestamp: Date;
}

class UnifiedIntelligenceEngine {
  
  // Core Method: Analyze ALL data and generate unified insights
  async generateUnifiedAnalysis(): Promise<UnifiedAlert[]> {
    const alerts: UnifiedAlert[] = [];

    // 1. Check Crypto Correlation Signal
    const cryptoSignal = await this.analyzeCryptoCorrelation();
    if (cryptoSignal) alerts.push(cryptoSignal);

    // 2. Check Political/Scandal Patterns
    const politicalSignal = await this.analyzePoliticalPatterns();
    if (politicalSignal) alerts.push(politicalSignal);

    // 3. Check for COMBINED signals (crypto + political = high-confidence)
    const combinedSignal = await this.detectCombinedSignals(cryptoSignal, politicalSignal);
    if (combinedSignal) alerts.push(combinedSignal);

    // 4. Store all alerts
    await this.storeAlerts(alerts);

    return alerts;
  }

  // Analyze crypto correlation data
  private async analyzeCryptoCorrelation(): Promise<UnifiedAlert | null> {
    try {
      const status = await cryptoStockCorrelationService.getCorrelationStatus();
      
      if (!status.latest_prediction) return null;

      const pred = status.latest_prediction;
      const isWeekend = ['weekend', 'pre_open'].includes(status.market_phase);
      
      // Only alert if high-confidence prediction exists
      if (pred.confidence_score < 0.70) return null;

      const severity = pred.confidence_score >= 0.85 ? 'critical' : 
                      pred.confidence_score >= 0.75 ? 'high' : 'medium';

      const tickers = JSON.parse(pred.high_correlation_tickers || '[]')
        .slice(0, 10)
        .map((t: any) => ({
          ticker: t.ticker,
          impact_prediction: t.predicted_change,
          recommendation: t.recommendation,
          correlation_strength: t.correlation_score
        }));

      return {
        id: `crypto_corr_${Date.now()}`,
        alert_type: 'crypto_correlation',
        severity,
        title: `Crypto Weekend Signal: ${pred.predicted_direction.toUpperCase()}`,
        description: `Bitcoin ${pred.crypto_weekend_change > 0 ? 'gained' : 'dropped'} ${Math.abs(pred.crypto_weekend_change).toFixed(2)}% over the weekend. Historical correlation suggests market will ${pred.predicted_direction.replace('_', ' ')} at open.`,
        confidence: pred.confidence_score,
        data_sources: ['crypto_prices_24_7', 'historical_correlation'],
        affected_tickers: tickers,
        action_items: [
          `Monitor ${tickers[0]?.ticker || 'COIN'} at market open`,
          `Set alerts for ${Math.abs(pred.crypto_weekend_change).toFixed(1)}% move threshold`,
          `Review positions in crypto-related stocks`,
          isWeekend ? 'Position ahead of Monday open' : 'Validate prediction against actual movement'
        ],
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Crypto correlation analysis error:', error);
      return null;
    }
  }

  // Analyze political patterns (from existing scandal detection system)
  private async analyzePoliticalPatterns(): Promise<UnifiedAlert | null> {
    try {
      // Query recent news for political keywords
      const newsQuery = await pool.query(`
        SELECT data_json, collected_at
        FROM raw_data_collection
        WHERE source_type = 'news'
        AND collected_at > NOW() - INTERVAL '24 hours'
        AND (
          data_json::text ILIKE '%investigation%'
          OR data_json::text ILIKE '%scandal%'
          OR data_json::text ILIKE '%impeachment%'
          OR data_json::text ILIKE '%resignation%'
          OR data_json::text ILIKE '%indictment%'
        )
        ORDER BY collected_at DESC
        LIMIT 20
      `);

      if (newsQuery.rows.length < 3) return null;

      // Use AI to analyze political impact
      const newsContext = newsQuery.rows
        .map(r => r.data_json.headline || r.data_json.title)
        .join('\n');

      const aiAnalysis = await this.analyzeWithClaude(newsContext);
      
      if (!aiAnalysis || aiAnalysis.confidence < 0.70) return null;

      return {
        id: `political_${Date.now()}`,
        alert_type: 'political_investigation',
        severity: aiAnalysis.severity,
        title: aiAnalysis.title,
        description: aiAnalysis.description,
        confidence: aiAnalysis.confidence,
        data_sources: ['news', 'historical_patterns'],
        affected_tickers: aiAnalysis.affected_tickers,
        historical_precedent: aiAnalysis.historical_precedent,
        action_items: aiAnalysis.action_items,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Political pattern analysis error:', error);
      return null;
    }
  }

  // Detect COMBINED signals (multiple data sources pointing same direction)
  private async detectCombinedSignals(
    cryptoSignal: UnifiedAlert | null, 
    politicalSignal: UnifiedAlert | null
  ): Promise<UnifiedAlert | null> {
    
    if (!cryptoSignal || !politicalSignal) return null;

    // Check if both signals predict downward movement
    const cryptoDown = cryptoSignal.title.toLowerCase().includes('down');
    const politicalDown = politicalSignal.severity === 'critical' || politicalSignal.severity === 'high';

    if (cryptoDown && politicalDown) {
      // COMBINED SIGNAL: High confidence market downturn
      const combinedConfidence = (cryptoSignal.confidence + politicalSignal.confidence) / 2 * 1.15; // Boost for agreement

      // Merge affected tickers
      const allTickers = [
        ...cryptoSignal.affected_tickers,
        ...politicalSignal.affected_tickers
      ];

      // Find overlapping tickers (highest confidence)
      const tickerMap = new Map();
      allTickers.forEach(t => {
        if (tickerMap.has(t.ticker)) {
          const existing = tickerMap.get(t.ticker);
          tickerMap.set(t.ticker, {
            ...t,
            correlation_strength: Math.max(existing.correlation_strength, t.correlation_strength),
            impact_prediction: (existing.impact_prediction + t.impact_prediction) / 2
          });
        } else {
          tickerMap.set(t.ticker, t);
        }
      });

      return {
        id: `combined_${Date.now()}`,
        alert_type: 'combined_signal',
        severity: 'critical',
        title: '🚨 MULTI-SOURCE ALERT: High-Confidence Market Downturn',
        description: `CRYPTO + POLITICAL signals both indicate significant market pressure. ${cryptoSignal.description} Additionally, ${politicalSignal.description}`,
        confidence: Math.min(combinedConfidence, 0.95),
        data_sources: ['crypto_correlation', 'political_news', 'historical_patterns'],
        affected_tickers: Array.from(tickerMap.values()).sort((a, b) => 
          (b.correlation_strength || 0) - (a.correlation_strength || 0)
        ).slice(0, 15),
        action_items: [
          '⚠️ IMMEDIATE: Review all open long positions',
          '📊 Consider hedging with inverse ETFs (SQQQ, SPXS)',
          '💰 Increase cash position to 30-40%',
          '🎯 Focus on defensive sectors: Utilities, Consumer Staples',
          '📈 Monitor VIX - expect volatility spike',
          '⏰ Set tight stop losses on growth stocks'
        ],
        timestamp: new Date()
      };
    }

    return null;
  }

  // Use Claude AI for deep analysis
  private async analyzeWithClaude(newsContext: string): Promise<any> {
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Analyze these political news headlines for market impact:

${newsContext}

Compare to historical precedents:
- Clinton-Lewinsky (1998): -3.8% market impact, 45 days duration
- Watergate (1973-74): -15% market impact, 180 days duration
- Trump Impeachment (2019): -2.1% market impact, 30 days duration

Provide analysis in JSON format:
{
  "severity": "critical|high|medium|low",
  "confidence": 0.0-1.0,
  "title": "Brief alert title",
  "description": "2-3 sentence impact summary",
  "affected_tickers": [{"ticker": "SPY", "impact_prediction": -2.5, "recommendation": "REDUCE"}],
  "historical_precedent": {"event": "Clinton-Lewinsky", "similarity": 0.78},
  "action_items": ["action 1", "action 2", "action 3"]
}`
        }]
      });

      const content = message.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
      return null;
    } catch (error) {
      console.error('Claude analysis error:', error);
      return null;
    }
  }

  // Store alerts in database
  private async storeAlerts(alerts: UnifiedAlert[]): Promise<void> {
    for (const alert of alerts) {
      try {
        await pool.query(`
          INSERT INTO unified_intelligence_alerts 
          (alert_type, severity, title, description, confidence, data_sources, affected_tickers, historical_precedent, action_items, timestamp)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          alert.alert_type,
          alert.severity,
          alert.title,
          alert.description,
          alert.confidence,
          JSON.stringify(alert.data_sources),
          JSON.stringify(alert.affected_tickers),
          JSON.stringify(alert.historical_precedent || {}),
          JSON.stringify(alert.action_items),
          alert.timestamp
        ]);
      } catch (error) {
        console.error('Error storing alert:', error);
      }
    }
  }

  // Get latest alerts for dashboard
  async getLatestAlerts(limit: number = 10): Promise<UnifiedAlert[]> {
    try {
      const result = await pool.query(`
        SELECT * FROM unified_intelligence_alerts
        ORDER BY timestamp DESC
        LIMIT $1
      `, [limit]);

      return result.rows.map(row => ({
        id: row.id,
        alert_type: row.alert_type,
        severity: row.severity,
        title: row.title,
        description: row.description,
        confidence: parseFloat(row.confidence),
        data_sources: row.data_sources,
        affected_tickers: row.affected_tickers,
        historical_precedent: row.historical_precedent,
        action_items: row.action_items,
        timestamp: row.timestamp
      }));
    } catch (error) {
      return [];
    }
  }

  // Start continuous monitoring
  async start(): Promise<void> {
    console.log('🚀 Unified Intelligence Engine started');
    
    // Run analysis every 5 minutes
    setInterval(async () => {
      try {
        await this.generateUnifiedAnalysis();
      } catch (error) {
        console.error('Analysis error:', error);
      }
    }, 5 * 60 * 1000);

    // Initial run
    await this.generateUnifiedAnalysis();
  }
}

const unifiedIntelligenceEngine = new UnifiedIntelligenceEngine();
export default unifiedIntelligenceEngine;
