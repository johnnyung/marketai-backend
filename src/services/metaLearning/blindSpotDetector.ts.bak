import { pool } from '../../db/index.js';
export const blindSpotDetector = {
    async scan() {
        // Check for sectors with 0 coverage
        const res = await pool.query(`
            SELECT sector, COUNT(*) as count 
            FROM ai_stock_tips GROUP BY sector
        `);
        const blindSpots = [];
        if (res.rows.length < 5) blindSpots.push("Sector Diversity Low");
        return blindSpots;
    }
};
