import { pool } from "../db/index.js";
// backend/src/services/patternRecognitionService.ts
// Phase 4: Learn which dimension patterns predict winning trades

import { Pool } from 'pg';
import Anthropic from '@anthropic-ai/sdk';


const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface DimensionPattern {
  executiveQuality: number;
  businessQuality: number;
  financialStrength: number;
  industryPosition: number;
  growthPotential: number;
  valuation: number;
  catalysts: number;
  riskAssessment: number;
  overallScore: number;
}

interface TradeResult {
  ticker: string;
  pattern: DimensionPattern;
  outcome: 'WIN' | 'LOSS';
  returnPct: number;
  sector?: string;
  daysHeld: number;
}

interface PatternInsights {
  // Dimension importance (which dimensions matter most)
  dimensionWeights: {
    executiveQuality: number;
    businessQuality: number;
    financialStrength: number;
    industryPosition: number;
    growthPotential: number;
    valuation: number;
    catalysts: number;
    riskAssessment: number;
  };
  
  // Winning patterns
  winningPatterns: {
    pattern: string;
    winRate: number;
    avgReturn: number;
    count: number;
    example: string;
  }[];
  
  // Losing patterns
  losingPatterns: {
    pattern: string;
    winRate: number;
    avgReturn: number;
    count: number;
    example: string;
  }[];
  
  // Optimal thresholds
  optimalThresholds: {
    minOverallScore: number;
    minBusinessQuality: number;
    minFinancialStrength: number;
    minGrowthPotential: number;
  };
  
  // Success probability model
  probabilityModel: {
    highProbability: string[];  // Patterns with 80%+ win rate
    mediumProbability: string[]; // 60-80% win rate
    lowProbability: string[];    // <60% win rate
  };
  
  // Recommendations
  recommendations: string[];
}

class PatternRecognitionService {
  /**
   * Analyze all closed trades to identify winning patterns
   */
  async analyzePatterns(): Promise<PatternInsights> {
    console.log('\n🧠 === PHASE 4: PATTERN RECOGNITION ANALYSIS ===\n');
    
    // Step 1: Get all closed trades with analysis data
    const trades = await this.getClosedTrades();
    
    if (trades.length < 10) {
      console.log('⚠️ Need at least 10 closed trades for pattern analysis');
      console.log(`Currently have: ${trades.length} trades`);
      return this.getDefaultInsights();
    }
    
    console.log(`✓ Analyzing ${trades.length} closed trades\n`);
    
    // Step 2: Calculate dimension importance
    console.log('📊 Step 1: Calculating dimension importance...');
    const dimensionWeights = await this.calculateDimensionImportance(trades);
    console.log('✓ Dimension weights calculated\n');
    
    // Step 3: Identify winning patterns
    console.log('🏆 Step 2: Identifying winning patterns...');
    const winningPatterns = await this.identifyWinningPatterns(trades);
    console.log(`✓ Found ${winningPatterns.length} winning patterns\n`);
    
    // Step 4: Identify losing patterns
    console.log('❌ Step 3: Identifying losing patterns...');
    const losingPatterns = await this.identifyLosingPatterns(trades);
    console.log(`✓ Found ${losingPatterns.length} losing patterns\n`);
    
    // Step 5: Optimize thresholds
    console.log('🎯 Step 4: Optimizing score thresholds...');
    const optimalThresholds = await this.optimizeThresholds(trades);
    console.log('✓ Optimal thresholds calculated\n');
    
    // Step 6: Build probability model
    console.log('📈 Step 5: Building success probability model...');
    const probabilityModel = await this.buildProbabilityModel(trades);
    console.log('✓ Probability model built\n');
    
    // Step 7: Generate recommendations
    console.log('💡 Step 6: Generating recommendations...');
    const recommendations = await this.generateRecommendations(
      dimensionWeights,
      winningPatterns,
      losingPatterns,
      optimalThresholds
    );
    console.log(`✓ Generated ${recommendations.length} recommendations\n`);
    
    const insights: PatternInsights = {
      dimensionWeights,
      winningPatterns,
      losingPatterns,
      optimalThresholds,
      probabilityModel,
      recommendations
    };
    
    // Save insights to database for future use
    await this.saveInsights(insights);
    
    console.log('✅ Pattern analysis complete!\n');
    return insights;
  }

  /**
   * Get all closed trades with analysis scores
   */
  private async getClosedTrades(): Promise<TradeResult[]> {
    const result = await pool.query(`
      SELECT 
        ticker,
        analysis_score,
        final_pnl_pct,
        total_days_held,
        sector,
        signal_data
      FROM ai_tip_tracker
      WHERE 
        status = 'CLOSED'
        AND analysis_score IS NOT NULL
        AND final_pnl_pct IS NOT NULL
      ORDER BY exit_date DESC
    `);
    
    return result.rows.map(row => {
      const signalData = row.signal_data || {};
      const analysis = signalData.analysis || {};
      
      return {
        ticker: row.ticker,
        pattern: {
          executiveQuality: analysis.executiveQuality?.score || 0,
          businessQuality: analysis.businessQuality?.score || 0,
          financialStrength: analysis.financialStrength?.score || 0,
          industryPosition: analysis.industryPosition?.score || 0,
          growthPotential: analysis.growthPotential?.score || 0,
          valuation: analysis.valuation?.score || 0,
          catalysts: analysis.catalysts?.score || 0,
          riskAssessment: analysis.riskAssessment?.score || 0,
          overallScore: row.analysis_score
        },
        outcome: parseFloat(row.final_pnl_pct) > 0 ? 'WIN' : 'LOSS',
        returnPct: parseFloat(row.final_pnl_pct),
        sector: row.sector,
        daysHeld: row.total_days_held || 0
      };
    });
  }

  /**
   * Calculate which dimensions correlate most with wins
   */
  private async calculateDimensionImportance(trades: TradeResult[]): Promise<any> {
    const wins = trades.filter(t => t.outcome === 'WIN');
    const losses = trades.filter(t => t.outcome === 'LOSS');
    
    const dimensions = [
      'executiveQuality',
      'businessQuality',
      'financialStrength',
      'industryPosition',
      'growthPotential',
      'valuation',
      'catalysts',
      'riskAssessment'
    ];
    
    const weights: any = {};
    
    for (const dim of dimensions) {
      const winAvg = wins.reduce((sum, t) => sum + (t.pattern[dim as keyof DimensionPattern] as number), 0) / wins.length;
      const lossAvg = losses.reduce((sum, t) => sum + (t.pattern[dim as keyof DimensionPattern] as number), 0) / losses.length;
      
      // Correlation: how much higher are winners vs losers?
      const correlation = winAvg - lossAvg;
      
      // Normalize to 0-1 scale
      weights[dim] = Math.max(0, Math.min(1, correlation / 10));
      
      console.log(`  ${dim}: Winners avg ${winAvg.toFixed(1)}, Losers avg ${lossAvg.toFixed(1)}, Correlation: ${correlation.toFixed(2)}`);
    }
    
    return weights;
  }

  /**
   * Identify patterns that consistently win
   */
  private async identifyWinningPatterns(trades: TradeResult[]): Promise<any[]> {
    const patterns: any[] = [];
    
    // Pattern 1: High business quality (moat)
    const highMoat = trades.filter(t => t.pattern.businessQuality >= 18);
    if (highMoat.length >= 3) {
      const winRate = highMoat.filter(t => t.outcome === 'WIN').length / highMoat.length;
      if (winRate >= 0.7) {
        patterns.push({
          pattern: 'High Business Quality (≥18/20)',
          winRate: winRate * 100,
          avgReturn: highMoat.reduce((sum, t) => sum + t.returnPct, 0) / highMoat.length,
          count: highMoat.length,
          example: highMoat[0].ticker
        });
      }
    }
    
    // Pattern 2: Strong financials + growth
    const financialGrowth = trades.filter(t => 
      t.pattern.financialStrength >= 14 && t.pattern.growthPotential >= 13
    );
    if (financialGrowth.length >= 3) {
      const winRate = financialGrowth.filter(t => t.outcome === 'WIN').length / financialGrowth.length;
      if (winRate >= 0.7) {
        patterns.push({
          pattern: 'Financial Strength + Growth (14/15 + 13/15)',
          winRate: winRate * 100,
          avgReturn: financialGrowth.reduce((sum, t) => sum + t.returnPct, 0) / financialGrowth.length,
          count: financialGrowth.length,
          example: financialGrowth[0].ticker
        });
      }
    }
    
    // Pattern 3: Exceptional overall score
    const exceptional = trades.filter(t => t.pattern.overallScore >= 85);
    if (exceptional.length >= 3) {
      const winRate = exceptional.filter(t => t.outcome === 'WIN').length / exceptional.length;
      patterns.push({
        pattern: 'Exceptional Overall Score (≥85/100)',
        winRate: winRate * 100,
        avgReturn: exceptional.reduce((sum, t) => sum + t.returnPct, 0) / exceptional.length,
        count: exceptional.length,
        example: exceptional[0].ticker
      });
    }
    
    // Pattern 4: Strong catalysts + momentum
    const momentum = trades.filter(t => 
      t.pattern.catalysts >= 8 && t.pattern.industryPosition >= 9
    );
    if (momentum.length >= 3) {
      const winRate = momentum.filter(t => t.outcome === 'WIN').length / momentum.length;
      if (winRate >= 0.7) {
        patterns.push({
          pattern: 'Strong Catalysts + Industry Position',
          winRate: winRate * 100,
          avgReturn: momentum.reduce((sum, t) => sum + t.returnPct, 0) / momentum.length,
          count: momentum.length,
          example: momentum[0].ticker
        });
      }
    }
    
    return patterns.sort((a, b) => b.winRate - a.winRate);
  }

  /**
   * Identify patterns that consistently lose
   */
  private async identifyLosingPatterns(trades: TradeResult[]): Promise<any[]> {
    const patterns: any[] = [];
    
    // Pattern 1: Weak business quality
    const weakMoat = trades.filter(t => t.pattern.businessQuality < 15);
    if (weakMoat.length >= 3) {
      const winRate = weakMoat.filter(t => t.outcome === 'WIN').length / weakMoat.length;
      if (winRate < 0.5) {
        patterns.push({
          pattern: 'Weak Business Quality (<15/20)',
          winRate: winRate * 100,
          avgReturn: weakMoat.reduce((sum, t) => sum + t.returnPct, 0) / weakMoat.length,
          count: weakMoat.length,
          example: weakMoat[0].ticker
        });
      }
    }
    
    // Pattern 2: Low growth potential
    const lowGrowth = trades.filter(t => t.pattern.growthPotential < 10);
    if (lowGrowth.length >= 3) {
      const winRate = lowGrowth.filter(t => t.outcome === 'WIN').length / lowGrowth.length;
      if (winRate < 0.5) {
        patterns.push({
          pattern: 'Low Growth Potential (<10/15)',
          winRate: winRate * 100,
          avgReturn: lowGrowth.reduce((sum, t) => sum + t.returnPct, 0) / lowGrowth.length,
          count: lowGrowth.length,
          example: lowGrowth[0].ticker
        });
      }
    }
    
    // Pattern 3: Borderline scores
    const borderline = trades.filter(t => t.pattern.overallScore >= 65 && t.pattern.overallScore < 75);
    if (borderline.length >= 3) {
      const winRate = borderline.filter(t => t.outcome === 'WIN').length / borderline.length;
      patterns.push({
        pattern: 'Borderline Overall Score (65-74)',
        winRate: winRate * 100,
        avgReturn: borderline.reduce((sum, t) => sum + t.returnPct, 0) / borderline.length,
        count: borderline.length,
        example: borderline[0].ticker
      });
    }
    
    return patterns.sort((a, b) => a.winRate - b.winRate);
  }

  /**
   * Optimize score thresholds based on actual results
   */
  private async optimizeThresholds(trades: TradeResult[]): Promise<any> {
    // Test different thresholds and find optimal
    const overallScores = [70, 75, 80, 85];
    const businessScores = [15, 16, 17, 18];
    
    let bestOverall = 65;
    let bestOverallWinRate = 0;
    
    for (const threshold of overallScores) {
      const filtered = trades.filter(t => t.pattern.overallScore >= threshold);
      if (filtered.length >= 5) {
        const winRate = filtered.filter(t => t.outcome === 'WIN').length / filtered.length;
        if (winRate > bestOverallWinRate) {
          bestOverallWinRate = winRate;
          bestOverall = threshold;
        }
      }
    }
    
    let bestBusiness = 15;
    let bestBusinessWinRate = 0;
    
    for (const threshold of businessScores) {
      const filtered = trades.filter(t => t.pattern.businessQuality >= threshold);
      if (filtered.length >= 5) {
        const winRate = filtered.filter(t => t.outcome === 'WIN').length / filtered.length;
        if (winRate > bestBusinessWinRate) {
          bestBusinessWinRate = winRate;
          bestBusiness = threshold;
        }
      }
    }
    
    console.log(`  Optimal overall threshold: ${bestOverall} (${(bestOverallWinRate * 100).toFixed(1)}% win rate)`);
    console.log(`  Optimal business threshold: ${bestBusiness} (${(bestBusinessWinRate * 100).toFixed(1)}% win rate)`);
    
    return {
      minOverallScore: bestOverall,
      minBusinessQuality: bestBusiness,
      minFinancialStrength: 13, // Conservative default
      minGrowthPotential: 11    // Conservative default
    };
  }

  /**
   * Build probability model for new signals
   */
  private async buildProbabilityModel(trades: TradeResult[]): Promise<any> {
    // Group trades by pattern characteristics
    const high = trades.filter(t => t.pattern.overallScore >= 85);
    const medium = trades.filter(t => t.pattern.overallScore >= 75 && t.pattern.overallScore < 85);
    const low = trades.filter(t => t.pattern.overallScore >= 65 && t.pattern.overallScore < 75);
    
    const highWinRate = high.length > 0 ? (high.filter(t => t.outcome === 'WIN').length / high.length) * 100 : 0;
    const mediumWinRate = medium.length > 0 ? (medium.filter(t => t.outcome === 'WIN').length / medium.length) * 100 : 0;
    const lowWinRate = low.length > 0 ? (low.filter(t => t.outcome === 'WIN').length / low.length) * 100 : 0;
    
    return {
      highProbability: [
        `Score ≥85: ${highWinRate.toFixed(1)}% win rate (${high.length} trades)`,
        'Business Quality ≥18: Dominant moat',
        'Financial Strength ≥14: Strong fundamentals'
      ],
      mediumProbability: [
        `Score 75-84: ${mediumWinRate.toFixed(1)}% win rate (${medium.length} trades)`,
        'Business Quality 16-17: Good moat',
        'Financial Strength 12-13: Solid fundamentals'
      ],
      lowProbability: [
        `Score 65-74: ${lowWinRate.toFixed(1)}% win rate (${low.length} trades)`,
        'Business Quality <16: Weak moat',
        'Growth Potential <10: Limited upside'
      ]
    };
  }

  /**
   * Generate actionable recommendations
   */
  private async generateRecommendations(
    dimensionWeights: any,
    winningPatterns: any[],
    losingPatterns: any[],
    optimalThresholds: any
  ): Promise<string[]> {
    const recommendations: string[] = [];
    
    // Threshold recommendations
    if (optimalThresholds.minOverallScore > 65) {
      recommendations.push(
        `Raise minimum overall score threshold to ${optimalThresholds.minOverallScore} (improves win rate)`
      );
    }
    
    if (optimalThresholds.minBusinessQuality > 15) {
      recommendations.push(
        `Prioritize business quality ≥${optimalThresholds.minBusinessQuality} (moat matters most)`
      );
    }
    
    // Dimension weight recommendations
    const sortedWeights = Object.entries(dimensionWeights)
      .sort(([,a], [,b]) => (b as number) - (a as number));
    
    const topDimension = sortedWeights[0][0];
    recommendations.push(
      `Focus on ${topDimension} - highest correlation with wins`
    );
    
    // Pattern recommendations
    if (winningPatterns.length > 0) {
      const topPattern = winningPatterns[0];
      recommendations.push(
        `Winning pattern: ${topPattern.pattern} (${topPattern.winRate.toFixed(1)}% win rate)`
      );
    }
    
    if (losingPatterns.length > 0) {
      const worstPattern = losingPatterns[0];
      recommendations.push(
        `Avoid: ${worstPattern.pattern} (${worstPattern.winRate.toFixed(1)}% win rate)`
      );
    }
    
    return recommendations;
  }

  /**
   * Save insights to database for future use
   */
  private async saveInsights(insights: PatternInsights): Promise<void> {
    await pool.query(`
      INSERT INTO pattern_insights (
        insights_data,
        analyzed_trades,
        created_at
      ) VALUES ($1, $2, NOW())
      ON CONFLICT (id) DO UPDATE SET
        insights_data = $1,
        analyzed_trades = $2,
        created_at = NOW()
    `, [
      JSON.stringify(insights),
      0 // Would track actual count
    ]);
  }

  /**
   * Get default insights when not enough data
   */
  private getDefaultInsights(): PatternInsights {
    return {
      dimensionWeights: {
        executiveQuality: 0.5,
        businessQuality: 0.8,  // Business quality most important
        financialStrength: 0.7,
        industryPosition: 0.6,
        growthPotential: 0.7,
        valuation: 0.4,
        catalysts: 0.6,
        riskAssessment: 0.5
      },
      winningPatterns: [],
      losingPatterns: [],
      optimalThresholds: {
        minOverallScore: 65,
        minBusinessQuality: 15,
        minFinancialStrength: 13,
        minGrowthPotential: 11
      },
      probabilityModel: {
        highProbability: ['Need more data to calculate'],
        mediumProbability: ['Need more data to calculate'],
        lowProbability: ['Need more data to calculate']
      },
      recommendations: [
        'Collect at least 10 closed trades for pattern analysis',
        'Focus on business quality (moat) as primary driver',
        'Track results to enable learning'
      ]
    };
  }

  /**
   * Calculate success probability for a new signal
   */
  async calculateSuccessProbability(signal: any): Promise<number> {
    const insights = await this.getLatestInsights();
    
    if (!insights) {
      return 0.5; // 50% default when no data
    }
    
    // Simple probability model based on score
    const score = signal.analysisScore || signal.analysis?.overallScore || 0;
    
    if (score >= 85) return 0.80; // 80% probability
    if (score >= 75) return 0.70; // 70% probability
    if (score >= 65) return 0.60; // 60% probability
    return 0.45; // Below threshold
  }

  /**
   * Get latest pattern insights
   */
  async getLatestInsights(): Promise<PatternInsights | null> {
    try {
      const result = await pool.query(`
        SELECT insights_data
        FROM pattern_insights
        ORDER BY created_at DESC
        LIMIT 1
      `);
      
      if (result.rows.length > 0) {
        return result.rows[0].insights_data;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
}

export default new PatternRecognitionService();
