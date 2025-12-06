import { pool } from '../db/index.js';

async function seed() {
    try {
        console.log('🌱 Seeding Portfolio for User 1...');
        
        // Ensure table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS portfolio_holdings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                ticker VARCHAR(10) NOT NULL,
                shares NUMERIC NOT NULL,
                avg_cost NUMERIC NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Check if empty
        const check = await pool.query('SELECT count(*) FROM portfolio_holdings WHERE user_id = 1');
        if (parseInt(check.rows[0].count) === 0) {
            await pool.query(`
                INSERT INTO portfolio_holdings (user_id, ticker, shares, avg_cost) VALUES
                (1, 'AAPL', 10, 180.00),
                (1, 'MSFT', 5, 350.00),
                (1, 'NVDA', 4, 850.00),
                (1, 'TSLA', 20, 175.00)
            `);
            console.log('✅ Added 4 holdings (AAPL, MSFT, NVDA, TSLA).');
        } else {
            console.log('ℹ️ Portfolio already seeded.');
        }
        process.exit(0);
    } catch (e) {
        console.error('❌ Seeding Failed:', e);
        process.exit(1);
    }
}

seed();
