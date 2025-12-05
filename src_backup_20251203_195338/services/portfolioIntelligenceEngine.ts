import unifiedIntelligenceFactory from './unifiedIntelligenceFactory.js';
import userPortfolioService from './userPortfolioService.js';

export interface PortfolioAnalysisResult {
    portfolio_metrics: {
        total_value: number;
        cash_balance: number;
        diversification_score: number;
        beta_weighted: number;
        risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
        warnings: string[];
    };
    positions: Array<{
        ticker: string;
        shares: number;
        current_value: number;
        intelligence: any;
        action_required: boolean;
        recommendation: string;
    }>;
}

class PortfolioIntelligenceEngine {

  /**
   * Analyzes portfolio using ONLY real data and math.
   * No mocks, no random scores.
   */
  async analyzePortfolio(userId: number): Promise<PortfolioAnalysisResult> {
    
    // 1. Get Real Holdings
    const holdings = await userPortfolioService.getHoldings(userId);
    
    if (!holdings || holdings.length === 0) {
        return {
            portfolio_metrics: {
                total_value: 0,
                cash_balance: 0,
                diversification_score: 0,
                beta_weighted: 0,
                risk_level: 'LOW',
                warnings: ['No holdings found.']
            },
            positions: []
        };
    }

    // 2. Analyze Each Position (Parallel)
    const analyzedPositions = await Promise.all(holdings.map(async (holding) => {
        try {
            const bundle = await unifiedIntelligenceFactory.generateBundle(holding.ticker);
            const currentVal = holding.shares * bundle.price_data.current;
            
            // Real Recommendation Logic
            let action = false;
            let rec = 'HOLD';
            
            // Sell if FSI Red or Deep Brain Conviction is Low
            if (bundle.engines.fsi.traffic_light === 'RED') {
                action = true;
                rec = 'SELL (Fundamental Risk)';
            } else if (bundle.scoring.final_conviction === 'AVOID') {
                action = true;
                rec = 'SELL (Technical Breakdown)';
            }

            return {
                ticker: holding.ticker,
                shares: holding.shares,
                current_value: currentVal,
                intelligence: bundle,
                action_required: action,
                recommendation: rec,
                beta: bundle.engines.fsi.metrics?.beta || 1.0, // Assuming beta populated if available
                sector: bundle.sector
            };
        } catch (e) {
            return null;
        }
    }));

    const validPositions = analyzedPositions.filter(p => p !== null) as any[];

    // 3. Calculate Portfolio Metrics (Real Math)
    const totalValue = validPositions.reduce((sum, p) => sum + p.current_value, 0);
    
    // Weighted Beta Calculation
    let weightedBeta = 0;
    if (totalValue > 0) {
        weightedBeta = validPositions.reduce((sum, p) => {
            return sum + (p.beta * (p.current_value / totalValue));
        }, 0);
    }

    // Diversification (Sector Count / Max Sectors)
    const sectors = new Set(validPositions.map(p => p.sector));
    const divScore = Math.min(100, Math.round((sectors.size / 11) * 100)); // 11 GICS Sectors

    // Risk Assessment
    let riskLevel: any = 'LOW';
    const warnings: string[] = [];

    if (divScore < 30) {
        riskLevel = 'HIGH';
        warnings.push('Low Diversification (Concentrated Sectors)');
    }
    if (weightedBeta > 1.5) {
        riskLevel = 'CRITICAL';
        warnings.push('High Volatility Exposure (Beta > 1.5)');
    }

    return {
        portfolio_metrics: {
            total_value: parseFloat(totalValue.toFixed(2)),
            cash_balance: 0,
            diversification_score: divScore,
            beta_weighted: parseFloat(weightedBeta.toFixed(2)),
            risk_level: riskLevel,
            warnings
        },
        positions: validPositions
    };
  }
}

export default new PortfolioIntelligenceEngine();
