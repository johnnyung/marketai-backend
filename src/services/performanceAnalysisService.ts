import { pool } from "../db/index.js";
// backend/src/services/performanceAnalysisService.ts
// Analyzes past AI signals to learn what works and what doesn't

import { Pool } from 'pg';


interface Signal {
  id: number;
  ticker: string;
  company_name: string;
  recommendation_type: string;
  entry_price: string;
  current_price: string | null;
  current_pnl_pct: string | null;
  final_pnl_pct: string | null;
  status: string;
  ai_confidence: number;
  ai_reasoning: string;
  entry_date: string;
  days_held: number;
}

interface PerformanceInsights {
  summary: {
    totalSignals: number;
    winRate: number;
    avgReturn: number;
    bestPick: any;
    worstPick: any;
  };
  winnerPatterns: string[];
  loserPatterns: string[];
  sectorAnalysis: any;
  confidenceAnalysis: any;
  timingAnalysis: any;
  successProfile: string;
  recommendations: string[];
}

class PerformanceAnalysisService {
  /**
   * Analyze all past signals and extract patterns
   */
  async analyzeAllSignals(): Promise<PerformanceInsights> {
    console.log('\n📊 === ANALYZING PAST PERFORMANCE ===\n');

    try {
      // Fetch all signals
      const result = await pool.query(`
        SELECT 
          id,
          ticker,
          company_name,
          recommendation_type,
          entry_price,
          current_price,
          current_pnl_pct,
          final_pnl_pct,
          status,
          ai_confidence,
          ai_reasoning,
          entry_date,
          days_held
        FROM ai_tip_tracker
        ORDER BY entry_date DESC
      `);

      const signals = result.rows as Signal[];
      console.log(`✓ Loaded ${signals.length} signals for analysis\n`);

      // Calculate returns for each signal
      const signalsWithReturns = signals.map(s => ({
        ...s,
        returnPct: s.status === 'CLOSED' 
          ? parseFloat(s.final_pnl_pct || '0')
          : parseFloat(s.current_pnl_pct || '0')
      }));

      // Separate winners and losers
      const winners = signalsWithReturns.filter(s => s.returnPct > 0);
      const losers = signalsWithReturns.filter(s => s.returnPct < 0);
      const breakeven = signalsWithReturns.filter(s => s.returnPct === 0);

      // Calculate summary stats
      const totalSignals = signals.length;
      const winRate = totalSignals > 0 ? (winners.length / totalSignals) * 100 : 0;
      const avgReturn = totalSignals > 0
        ? signalsWithReturns.reduce((sum, s) => sum + s.returnPct, 0) / totalSignals
        : 0;

      const bestPick = [...signalsWithReturns].sort((a, b) => b.returnPct - a.returnPct)[0];
      const worstPick = [...signalsWithReturns].sort((a, b) => a.returnPct - b.returnPct)[0];

      console.log('📈 Summary Statistics:');
      console.log(`  Total Signals: ${totalSignals}`);
      console.log(`  Winners: ${winners.length} | Losers: ${losers.length} | Breakeven: ${breakeven.length}`);
      console.log(`  Win Rate: ${winRate.toFixed(1)}%`);
      console.log(`  Avg Return: ${avgReturn.toFixed(2)}%`);
      console.log(`  Best: ${bestPick?.ticker} (${bestPick?.returnPct.toFixed(2)}%)`);
      console.log(`  Worst: ${worstPick?.ticker} (${worstPick?.returnPct.toFixed(2)}%)\n`);

      // Analyze patterns
      const winnerPatterns = this.extractWinnerPatterns(winners);
      const loserPatterns = this.extractLoserPatterns(losers);
      const sectorAnalysis = this.analyzeSectors(signalsWithReturns);
      const confidenceAnalysis = this.analyzeConfidence(signalsWithReturns);
      const timingAnalysis = this.analyzeTiming(signalsWithReturns);

      // Build success profile
      const successProfile = this.buildSuccessProfile(winnerPatterns, loserPatterns);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        winnerPatterns,
        loserPatterns,
        sectorAnalysis,
        confidenceAnalysis
      );

      const insights: PerformanceInsights = {
        summary: {
          totalSignals,
          winRate,
          avgReturn,
          bestPick: bestPick ? {
            ticker: bestPick.ticker,
            return: bestPick.returnPct,
            reasoning: bestPick.ai_reasoning.substring(0, 200)
          } : null,
          worstPick: worstPick ? {
            ticker: worstPick.ticker,
            return: worstPick.returnPct,
            reasoning: worstPick.ai_reasoning.substring(0, 200)
          } : null
        },
        winnerPatterns,
        loserPatterns,
        sectorAnalysis,
        confidenceAnalysis,
        timingAnalysis,
        successProfile,
        recommendations
      };

      console.log('✅ Performance analysis complete\n');
      return insights;

    } catch (error) {
      console.error('❌ Performance analysis failed:', error);
      throw error;
    }
  }

  /**
   * Extract patterns from winning signals
   */
  private extractWinnerPatterns(winners: any[]): string[] {
    const patterns: string[] = [];

    if (winners.length === 0) return ['No winners yet to analyze'];

    // Analyze confidence levels
    const highConfidenceWinners = winners.filter(w => w.ai_confidence >= 80);
    if (highConfidenceWinners.length > 0) {
      const winRate = (highConfidenceWinners.length / winners.length) * 100;
      patterns.push(`High confidence (80+): ${highConfidenceWinners.length} winners (${winRate.toFixed(0)}% of all winners)`);
    }

    // Analyze recommendation types
    const buyWinners = winners.filter(w => w.recommendation_type === 'BUY');
    if (buyWinners.length > 0) {
      patterns.push(`BUY recommendations: ${buyWinners.length}/${winners.length} winners`);
    }

    // Analyze big winners (>20% return)
    const bigWinners = winners.filter(w => w.returnPct > 20);
    if (bigWinners.length > 0) {
      const avgReturn = bigWinners.reduce((sum, w) => sum + w.returnPct, 0) / bigWinners.length;
      patterns.push(`Big winners (>20%): ${bigWinners.length} signals averaging ${avgReturn.toFixed(1)}% return`);
      
      // What made them special?
      const tickers = bigWinners.map(w => w.ticker).join(', ');
      patterns.push(`Top performers: ${tickers}`);
    }

    // Analyze entry timing
    const quickWinners = winners.filter(w => w.days_held <= 7);
    if (quickWinners.length > 0) {
      patterns.push(`Quick wins (<7 days): ${quickWinners.length} signals`);
    }

    // Analyze common reasoning keywords in winners
    const reasoningKeywords = this.extractKeywords(winners.map(w => w.ai_reasoning));
    if (reasoningKeywords.length > 0) {
      patterns.push(`Common success factors: ${reasoningKeywords.slice(0, 5).join(', ')}`);
    }

    return patterns;
  }

  /**
   * Extract patterns from losing signals
   */
  private extractLoserPatterns(losers: any[]): string[] {
    const patterns: string[] = [];

    if (losers.length === 0) return ['No losers yet to analyze'];

    // Analyze confidence levels
    const lowConfidenceLosers = losers.filter(l => l.ai_confidence < 75);
    if (lowConfidenceLosers.length > 0) {
      patterns.push(`Low confidence (<75): ${lowConfidenceLosers.length}/${losers.length} were losers`);
    }

    // Analyze big losers (>20% loss)
    const bigLosers = losers.filter(l => l.returnPct < -20);
    if (bigLosers.length > 0) {
      const avgLoss = bigLosers.reduce((sum, l) => sum + l.returnPct, 0) / bigLosers.length;
      patterns.push(`Big losers (<-20%): ${bigLosers.length} signals averaging ${avgLoss.toFixed(1)}% loss`);
      
      const tickers = bigLosers.map(l => l.ticker).join(', ');
      patterns.push(`Worst performers: ${tickers} - AVOID similar setups`);
    }

    // Analyze recommendation types
    const sellLosers = losers.filter(l => l.recommendation_type === 'SELL');
    if (sellLosers.length > 0) {
      patterns.push(`SELL recommendations: ${sellLosers.length}/${losers.length} were losers - reconsider SELL strategy`);
    }

    // Analyze common reasoning keywords in losers
    const reasoningKeywords = this.extractKeywords(losers.map(l => l.ai_reasoning));
    if (reasoningKeywords.length > 0) {
      patterns.push(`Common red flags: ${reasoningKeywords.slice(0, 5).join(', ')}`);
    }

    return patterns;
  }

  /**
   * Analyze performance by sector (inferred from ticker/company)
   */
  private analyzeSectors(signals: any[]): any {
    // Simple sector inference - in Phase 2 we'll get real sector data
    const sectorKeywords = {
      'Tech': ['tech', 'software', 'ai', 'semiconductor', 'chip', 'data', 'cloud'],
      'Healthcare': ['health', 'pharma', 'bio', 'medical', 'drug', 'hospital'],
      'Finance': ['bank', 'financial', 'insurance', 'capital', 'investment'],
      'Energy': ['energy', 'oil', 'gas', 'renewable', 'solar'],
      'Industrial': ['industrial', 'manufacturing', 'construction', 'machinery']
    };

    const sectorPerformance: any = {};

    signals.forEach(signal => {
      const text = (signal.company_name + ' ' + signal.ai_reasoning).toLowerCase();
      
      for (const [sector, keywords] of Object.entries(sectorKeywords)) {
        if (keywords.some(kw => text.includes(kw))) {
          if (!sectorPerformance[sector]) {
            sectorPerformance[sector] = { count: 0, totalReturn: 0, winners: 0 };
          }
          sectorPerformance[sector].count++;
          sectorPerformance[sector].totalReturn += signal.returnPct;
          if (signal.returnPct > 0) sectorPerformance[sector].winners++;
        }
      }
    });

    // Calculate averages
    Object.keys(sectorPerformance).forEach(sector => {
      const data = sectorPerformance[sector];
      data.avgReturn = data.totalReturn / data.count;
      data.winRate = (data.winners / data.count) * 100;
    });

    return sectorPerformance;
  }

  /**
   * Analyze confidence level accuracy
   */
  private analyzeConfidence(signals: any[]): any {
    const confidenceBuckets: {
      [key: string]: { signals: any[]; avgReturn: number };
    } = {
      '90-100': { signals: [], avgReturn: 0 },
      '80-89': { signals: [], avgReturn: 0 },
      '70-79': { signals: [], avgReturn: 0 },
      '<70': { signals: [], avgReturn: 0 }
    };

    signals.forEach(signal => {
      if (signal.ai_confidence >= 90) {
        confidenceBuckets['90-100'].signals.push(signal);
      } else if (signal.ai_confidence >= 80) {
        confidenceBuckets['80-89'].signals.push(signal);
      } else if (signal.ai_confidence >= 70) {
        confidenceBuckets['70-79'].signals.push(signal);
      } else {
        confidenceBuckets['<70'].signals.push(signal);
      }
    });

    // Calculate average returns
    Object.keys(confidenceBuckets).forEach(bucket => {
      const data = confidenceBuckets[bucket];
      if (data.signals.length > 0) {
        data.avgReturn = data.signals.reduce((sum: number, s: any) => sum + s.returnPct, 0) / data.signals.length;
      }
    });

    return confidenceBuckets;
  }

  /**
   * Analyze timing patterns
   */
  private analyzeTiming(signals: any[]): any {
    const timingBuckets: {
      [key: string]: { range: string; signals: any[]; avgReturn: number };
    } = {
      'quick': { range: '0-3 days', signals: [], avgReturn: 0 },
      'short': { range: '4-7 days', signals: [], avgReturn: 0 },
      'medium': { range: '8-14 days', signals: [], avgReturn: 0 },
      'long': { range: '15+ days', signals: [], avgReturn: 0 }
    };

    signals.forEach(signal => {
      if (signal.days_held <= 3) {
        timingBuckets.quick.signals.push(signal);
      } else if (signal.days_held <= 7) {
        timingBuckets.short.signals.push(signal);
      } else if (signal.days_held <= 14) {
        timingBuckets.medium.signals.push(signal);
      } else {
        timingBuckets.long.signals.push(signal);
      }
    });

    // Calculate averages
    Object.keys(timingBuckets).forEach(bucket => {
      const data = timingBuckets[bucket];
      if (data.signals.length > 0) {
        data.avgReturn = data.signals.reduce((sum: number, s: any) => sum + s.returnPct, 0) / data.signals.length;
      }
    });

    return timingBuckets;
  }

  /**
   * Extract common keywords from reasoning text
   */
  private extractKeywords(reasoningTexts: string[]): string[] {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const wordFreq: { [key: string]: number } = {};

    reasoningTexts.forEach(text => {
      const words: string[] = text.toLowerCase().match(/\b\w+\b/g) || [];
      words.forEach(word => {
        if (word.length > 4 && !stopWords.includes(word)) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      });
    });

    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Build success profile from patterns
   */
  private buildSuccessProfile(winnerPatterns: string[], loserPatterns: string[]): string {
    const profile = [
      'WINNING FORMULA:',
      ...winnerPatterns.map(p => `✓ ${p}`),
      '',
      'RED FLAGS TO AVOID:',
      ...loserPatterns.map(p => `✗ ${p}`)
    ];

    return profile.join('\n');
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    winnerPatterns: string[],
    loserPatterns: string[],
    sectorAnalysis: any,
    confidenceAnalysis: any
  ): string[] {
    const recommendations: string[] = [];

    // Confidence recommendations
    const highConfBucket = confidenceAnalysis['90-100'];
    if (highConfBucket.signals.length > 0 && highConfBucket.avgReturn > 5) {
      recommendations.push(`PRIORITIZE signals with 90+ confidence - averaging ${highConfBucket.avgReturn.toFixed(1)}% return`);
    }

    // Sector recommendations
    const bestSector = Object.entries(sectorAnalysis)
      .sort((a: any, b: any) => b[1].avgReturn - a[1].avgReturn)[0];
    
    if (bestSector) {
      const [sector, data]: [string, any] = bestSector;
      recommendations.push(`FOCUS on ${sector} sector - ${data.winRate.toFixed(0)}% win rate, avg ${data.avgReturn.toFixed(1)}% return`);
    }

    // Pattern-based recommendations
    if (winnerPatterns.some(p => p.includes('Big winners'))) {
      recommendations.push('SEEK opportunities with >20% upside potential - our sweet spot');
    }

    if (loserPatterns.some(p => p.includes('Big losers'))) {
      recommendations.push('AVOID high-risk small caps and recent IPOs - major loss drivers');
    }

    return recommendations;
  }

  /**
   * Get formatted insights for Claude prompt
   */
  async getInsightsForPrompt(): Promise<string> {
    const insights = await this.analyzeAllSignals();

    return `
=== HISTORICAL PERFORMANCE ANALYSIS ===

SUMMARY:
- Total Signals Analyzed: ${insights.summary.totalSignals}
- Current Win Rate: ${insights.summary.winRate.toFixed(1)}%
- Average Return: ${insights.summary.avgReturn.toFixed(2)}%
- Best Pick: ${insights.summary.bestPick?.ticker} (${insights.summary.bestPick?.return.toFixed(1)}%)
- Worst Pick: ${insights.summary.worstPick?.ticker} (${insights.summary.worstPick?.return.toFixed(1)}%)

WHAT WORKS (WINNER PATTERNS):
${insights.winnerPatterns.map(p => `• ${p}`).join('\n')}

WHAT FAILS (LOSER PATTERNS):
${insights.loserPatterns.map(p => `• ${p}`).join('\n')}

SECTOR PERFORMANCE:
${Object.entries(insights.sectorAnalysis).map(([sector, data]: [string, any]) => 
  `• ${sector}: ${data.winRate.toFixed(0)}% win rate, avg ${data.avgReturn.toFixed(1)}% return (${data.count} signals)`
).join('\n')}

KEY RECOMMENDATIONS:
${insights.recommendations.map(r => `• ${r}`).join('\n')}

CRITICAL: Use these insights to ONLY recommend high-probability opportunities.
Focus on patterns that worked. Avoid patterns that failed.
We need 70%+ win rate moving forward.
`;
  }
}

export default new PerformanceAnalysisService();
