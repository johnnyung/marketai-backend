import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function seed() {
  console.log("   🌱 Seeding 3 Mock Active Signals...");
  try {
    // Clear existing active tips to avoid clutter
    await pool.query("UPDATE ai_stock_tips SET status = 'archived' WHERE status = 'active'");

    const tips = [
        {
            ticker: 'NVDA',
            price: 140.50,
            action: 'BUY',
            confidence: 88,
            tier: 'blue_chip',
            reason: 'Strong Gamma Exposure + Insider Buying detected.',
            plan: {
                entry_primary: 140.50,
                stop_loss: 132.00,
                take_profit_1: 155.00,
                allocation_percent: 6.5,
                time_horizon: '2-4 Weeks',
                advanced_explanation: 'Setup driven by high gamma and insider alignment. DSC adjusted stop.'
            },
            matrix: {
                engines: {
                    gamma: { volatility_regime: 'AMPLIFIED' },
                    fsi: { traffic_light: 'GREEN' },
                    narrative: { pressure_score: 85 },
                    shadow: { bias: 'ACCUMULATION' },
                    regime: { current_regime: 'RISK_ON' }
                }
            }
        },
        {
            ticker: 'TSLA',
            price: 220.00,
            action: 'BUY',
            confidence: 75,
            tier: 'explosive_growth',
            reason: 'Technical Reversal on High Volume.',
            plan: {
                entry_primary: 220.00,
                stop_loss: 205.00,
                take_profit_1: 245.00,
                allocation_percent: 4.0,
                time_horizon: '1-2 Weeks',
                advanced_explanation: 'Volatility play with strict stops due to macro headwinds.'
            },
            matrix: {
                engines: {
                    gamma: { volatility_regime: 'NORMAL' },
                    fsi: { traffic_light: 'YELLOW' },
                    narrative: { pressure_score: 70 }
                }
            }
        },
        {
            ticker: 'COIN',
            price: 250.00,
            action: 'WATCH',
            confidence: 60,
            tier: 'crypto_alpha',
            reason: 'Monitoring for breakout above $255.',
            plan: {
                entry_primary: 255.00,
                stop_loss: 230.00,
                take_profit_1: 300.00,
                allocation_percent: 3.0,
                time_horizon: 'Days',
                advanced_explanation: 'Crypto beta play waiting for confirmation.'
            },
            matrix: {
                engines: {
                    gamma: { volatility_regime: 'SUPPRESSED' },
                    fsi: { traffic_light: 'RED' },
                    narrative: { pressure_score: 65 }
                }
            }
        }
    ];

    for (const t of tips) {
        await pool.query(`
            INSERT INTO ai_stock_tips
            (ticker, action, confidence, entry_price, target_price, stop_loss,
             reasoning, status, tier, phfa_data, decision_matrix, created_at, signal_expiry)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9, $10, NOW(), NOW() + INTERVAL '24 hours')
        `, [
            t.ticker, t.action, t.confidence, t.price, t.plan.take_profit_1, t.plan.stop_loss,
            t.reason, t.tier, JSON.stringify(t.plan), JSON.stringify(t.matrix)
        ]);
    }

    console.log("   ✅ Seed Complete.");
    process.exit(0);

  } catch (e: any) {
    console.error("   ❌ Seed Failed:", e.message);
    process.exit(1);
  }
}

seed();
