import { pool } from "../../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';

// --- SERVICES ---
import riskConstraintService from '../../services/riskConstraintService.js';
import portfolioManagerService from '../../services/portfolioManagerService.js';
import hedgingService from '../../services/hedgingService.js';
import paperTradingService from '../../services/paperTradingService.js';
import tradeManagementService from '../../services/tradeManagementService.js';
import marketDataService from '../../services/marketDataService.js';

dotenv.config();

// Local pool for the audit script itself

const TEST_SCENARIOS = [
    { ticker: 'AAPL', type: 'blue_chip', sector: 'Technology', sentiment: 85 },
    { ticker: 'NVDA', type: 'explosive_growth', sector: 'Technology', sentiment: 92 },
    { ticker: 'XOM', type: 'sector_play', sector: 'Energy', sentiment: 75 },
    { ticker: 'TSLA', type: 'explosive_growth', sector: 'Consumer Cyclical', sentiment: 60 },
    { ticker: 'JPM', type: 'blue_chip', sector: 'Financial Services', sentiment: 80 },
    { ticker: 'BTC-USD', type: 'crypto_alpha', sector: 'Crypto', sentiment: 88 },
    { ticker: 'MSTR', type: 'crypto_alpha', sector: 'Technology', sentiment: 90 },
    { ticker: 'AMC', type: 'sector_play', sector: 'Communication Services', sentiment: 40 },
    { ticker: 'PLTR', type: 'explosive_growth', sector: 'Technology', sentiment: 82 },
    { ticker: 'TLT', type: 'sector_play', sector: 'Fixed Income', sentiment: 50 }
];

async function runSimulation() {
    console.log("   ⚙️  Starting 10-Trade Lifecycle Simulation...");
    
    const report: any = {
        setup: { status: 'PENDING', portfolio_id: 0 },
        trades: [],
        magistrate_review: [],
        cleanup: { status: 'PENDING' }
    };

    let simPortfolioId = 0;

    try {
        // 1. SETUP SIMULATION PORTFOLIO
        const pfRes = await pool.query(`
            INSERT INTO portfolios (user_id, name, type, starting_cash, current_cash)
            VALUES (1, 'AUDIT_SIMULATION', 'paper', 1000000, 1000000)
            RETURNING id
        `);
        simPortfolioId = pfRes.rows[0].id;
        report.setup = { status: 'PASS', portfolio_id: simPortfolioId };

        // 2. PROCESS TRADES
        for (const trade of TEST_SCENARIOS) {
            const tradeLog: any = { ticker: trade.ticker, steps: {} };
            
            try {
                // A. Get Price
                const quote = await marketDataService.getStockPrice(trade.ticker);
                const price = quote?.price || 100;
                tradeLog.steps.price_check = { price, source: quote?.source || 'Mock' };

                // B. Risk Constraint Check
                const risk = await riskConstraintService.checkFit(trade.ticker);
                tradeLog.steps.risk_check = { passed: risk.passed, reason: risk.reason };

                // C. Position Sizing
                const sizing = portfolioManagerService.calculateAllocation(trade.type, trade.sentiment, 'Medium');
                tradeLog.steps.sizing = { pct: sizing.pct, kelly: sizing.kelly };

                // D. Hedging Check
                const hedge = await hedgingService.calculateHedge([trade]);
                tradeLog.steps.hedging = { needed: !!hedge, ticker: hedge?.ticker };

                // E. Execution
                if (risk.passed && price > 0) {
                    const shares = Math.floor((1000000 * (sizing.pct / 100)) / price);
                    if (shares > 0) {
                        await pool.query(`
                            INSERT INTO stock_positions
                            (portfolio_id, ticker, shares, avg_entry_price, current_price, cost_basis, market_value, unrealized_pnl)
                            VALUES ($1, $2, $3, $4, $4, $5, $5, 0)
                        `, [simPortfolioId, trade.ticker, shares, price, (shares * price)]);
                        
                        tradeLog.steps.execution = { status: 'FILLED', shares, cost: shares * price };
                    } else {
                        tradeLog.steps.execution = { status: 'SKIPPED', reason: 'Zero Shares' };
                    }
                } else {
                    tradeLog.steps.execution = { status: 'BLOCKED', reason: 'Risk/Price Fail' };
                }

            } catch (e: any) {
                tradeLog.error = e.message;
            }
            report.trades.push(tradeLog);
        }

        // 3. SIMULATE MARKET MOVE
        await pool.query("UPDATE stock_positions SET current_price = avg_entry_price * 1.50 WHERE ticker = 'NVDA' AND portfolio_id = $1", [simPortfolioId]);
        await pool.query("UPDATE stock_positions SET current_price = avg_entry_price * 0.85 WHERE ticker = 'AMC' AND portfolio_id = $1", [simPortfolioId]);

        // 4. MAGISTRATE REVIEW
        const positions = await pool.query("SELECT * FROM stock_positions WHERE portfolio_id = $1", [simPortfolioId]);
        
        for (const pos of positions.rows) {
            const pnlPct = ((pos.current_price - pos.avg_entry_price) / pos.avg_entry_price) * 100;
            let action = 'HOLD';
            if (pnlPct > 30) action = 'TAKE_PROFIT';
            if (pnlPct < -8) action = 'STOP_LOSS';

            report.magistrate_review.push({
                ticker: pos.ticker,
                pnl_pct: pnlPct.toFixed(2) + '%',
                verdict: action
            });
        }

        // 5. CLEANUP
        await pool.query("DELETE FROM stock_positions WHERE portfolio_id = $1", [simPortfolioId]);
        await pool.query("DELETE FROM portfolios WHERE id = $1", [simPortfolioId]);
        report.cleanup = { status: 'PASS', message: 'Simulation Portfolio Deleted' };

        console.log(JSON.stringify(report, null, 2));
        
        // Explicitly kill process to prevent hanging
        process.exit(0);

    } catch (e: any) {
        console.error("FATAL SIMULATION ERROR:", e);
        if (simPortfolioId > 0) {
            // Emergency Cleanup
            try {
                await pool.query("DELETE FROM stock_positions WHERE portfolio_id = $1", [simPortfolioId]);
                await pool.query("DELETE FROM portfolios WHERE id = $1", [simPortfolioId]);
            } catch(cleanupErr) {}
        }
        process.exit(1);
    }
}

runSimulation();
