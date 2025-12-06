import { pool } from '../../db/index.js';
export const signalWeightOptimizer = {
    async optimize(attribution: Record<string, number>) {
        const weights: Record<string, number> = {};
        const max = Math.max(...Object.values(attribution).map(Math.abs));
        
        for (const [k, v] of Object.entries(attribution)) {
            // Normalize to 0.5 - 1.5
            let weight = 1.0 + (v / max) * 0.5;
            weights[k] = parseFloat(weight.toFixed(2));
            
            // Persist
            await pool.query(`
                INSERT INTO signal_weights (signal_name, weight, last_updated)
                VALUES ($1, $2, NOW())
                ON CONFLICT (signal_name) DO UPDATE SET weight = $2, last_updated = NOW()
            `, [k, weights[k]]);
        }
        return weights;
    },
    async getCurrentWeights() {
        const res = await pool.query("SELECT signal_name, weight FROM signal_weights");
        const w: Record<string, number> = {};
        res.rows.forEach(r => w[r.signal_name] = parseFloat(r.weight));
        return w;
    }
};
