import { pool } from '../../db/index.js';
export const memorySnapshotLogger = {
    async logSnapshot(data: any) {
        await pool.query(`
            INSERT INTO meta_learning_snapshots (active_biases, drift_metrics, created_at)
            VALUES ($1, $2, NOW())
        `, [JSON.stringify(data.weights), JSON.stringify(data.drift)]);
    }
};
