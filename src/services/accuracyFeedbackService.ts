import pool from '../db/index.js';

interface EngineWeights {
    [key: string]: number;
}

interface AdaptationParams {
    stop_loss_padding: number;
    conviction_threshold: number;
    max_allocation_cap: number;
}

class AccuracyFeedbackService {
    
    // Default weights if DB is empty
    private defaultWeights: EngineWeights = {
        ace: 1.0, // Analyst Consensus
        fsi: 1.0, // Fundamental Health
        ife: 1.0, // Institutional Flow
        gmf: 1.0, // Global Macro
        carm: 1.0, // Risk Monitor
        cae: 1.0, // Corporate Actions
        vre: 1.0, // Volatility Regime
        uoa: 1.0, // Unusual Options
        mbe: 1.0, // Market Breadth
        ipe: 1.0, // Insider Patterns
        dve: 1.0, // Deep Valuation
        hapde: 1.0, // Hedge Fund Patterns
        gnae: 1.0, // Global News
        correlation: 1.0 // Cross-Asset
    };

    /**
     * Retrieves current dynamic weights for all engines.
     * Used by UnifiedIntelligenceFactory to score picks.
     */
    async getWeights(): Promise<EngineWeights> {
        try {
            const res = await pool.query('SELECT engine_id, weight FROM engine_weights');
            if (res.rows.length === 0) return this.defaultWeights;

            const weights = { ...this.defaultWeights };
            res.rows.forEach(r => {
                weights[r.engine_id] = parseFloat(r.weight);
            });
            return weights;
        } catch (e) {
            console.error('AFL: Error fetching weights, using defaults.', e);
            return this.defaultWeights;
        }
    }

    /**
     * Retrieves global system adaptation parameters.
     * Used by TradeArchitect for sizing/stops.
     */
    async getAdaptations(): Promise<AdaptationParams> {
        try {
            const res = await pool.query('SELECT param_key, param_value FROM system_adaptations');
            const params: any = {
                stop_loss_padding: 1.0,
                conviction_threshold: 70.0,
                max_allocation_cap: 0.15
            };
            
            res.rows.forEach(r => {
                params[r.param_key] = parseFloat(r.param_value);
            });
            return params;
        } catch (e) {
            return { stop_loss_padding: 1.0, conviction_threshold: 70.0, max_allocation_cap: 0.15 };
        }
    }

    /**
     * THE LEARNING LOOP
     * Analyzes closed trades and updates weights.
     * @param tradeOutcome { ticker: string, pnlPercent: number, contributingEngines: string[] }
     */
    async processTradeOutcome(ticker: string, pnlPercent: number, contributingEngines: string[]) {
        try {
            const isWin = pnlPercent > 0;
            const multiplier = isWin ? 1.05 : 0.95; // Nudge weights by 5%

            // Update weights for engines that voted for this trade
            for (const engine of contributingEngines) {
                await this.updateEngineWeight(engine, isWin, multiplier);
            }

            // Update System Adaptations based on Stop Loss hits
            if (pnlPercent < -5.0) {
                // If we took a big hit, WIDEN the stop loss padding slightly for future trades
                await pool.query(`
                    UPDATE system_adaptations
                    SET param_value = LEAST(param_value * 1.02, 1.5)
                    WHERE param_key = 'stop_loss_padding'
                `);
            } else if (isWin) {
                // If winning, slowly tighten stops back to normal
                await pool.query(`
                    UPDATE system_adaptations
                    SET param_value = GREATEST(param_value * 0.99, 0.8)
                    WHERE param_key = 'stop_loss_padding'
                `);
            }

            console.log(`🧠 AFL: Processed outcome for ${ticker} (${pnlPercent}%). Adjusted ${contributingEngines.length} engines.`);

        } catch (e) {
            console.error('AFL: Error processing outcome', e);
        }
    }

    private async updateEngineWeight(engine: string, isWin: boolean, multiplier: number) {
        // Upsert logic
        await pool.query(`
            INSERT INTO engine_weights (engine_id, weight, wins, losses)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (engine_id) DO UPDATE
            SET weight = GREATEST(LEAST(engine_weights.weight * $5, 2.0), 0.1), -- Clamp between 0.1 and 2.0
                wins = engine_weights.wins + $6,
                losses = engine_weights.losses + $7,
                last_updated = NOW()
        `, [
            engine,
            isWin ? 1.05 : 0.95, // Initial weight if new
            isWin ? 1 : 0,
            isWin ? 0 : 1,
            multiplier, // The nudging factor
            isWin ? 1 : 0,
            isWin ? 0 : 1
        ]);
    }
}

export default new AccuracyFeedbackService();
