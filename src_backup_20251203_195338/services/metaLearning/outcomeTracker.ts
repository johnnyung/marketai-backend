import pool from '../../db/index.js';
// Wraps predictionReviewService to provide raw stats
export const outcomeTracker = {
    async getRecentOutcomes(days: number = 7) {
        const res = await pool.query(`
            SELECT * FROM prediction_results 
            WHERE result_outcome IN ('WIN', 'LOSS') 
            AND updated_at > NOW() - INTERVAL '${days} days'
        `);
        return res.rows;
    }
};
