import pool from '../../db/index.js';
export const dataCoverageMap = {
    async mapCoverage() {
        const res = await pool.query(`SELECT COUNT(*) FROM digest_entries WHERE created_at > NOW() - INTERVAL '24h'`);
        return { daily_volume: parseInt(res.rows[0].count), status: parseInt(res.rows[0].count) > 50 ? 'HEALTHY' : 'LOW' };
    }
};
