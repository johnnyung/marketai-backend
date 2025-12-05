import pool from '../db/index.js';
import axios from 'axios';

class CryptoStockCorrelationService {
  
  private isMarketHours(): boolean {
    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    if (day === 0 || day === 6) return false;
    const currentTime = hours * 60 + minutes;
    return currentTime >= 570 && currentTime < 960; // 9:30 - 16:00
  }

  async getCorrelationStatus() {
    try {
        // Get recent predictions
        const predictions = await pool.query(`
            SELECT * FROM correlation_signals
            WHERE created_at > NOW() - INTERVAL '7 days'
            ORDER BY created_at DESC LIMIT 5
        `);
        
        // Get latest crypto moves
        const crypto = await this.fetchCryptoSnapshot();

        return {
            status: 'active',
            market_phase: this.isMarketHours() ? 'open' : 'closed',
            latest_prediction: predictions.rows[0] || null,
            crypto_snapshot: crypto
        };
    } catch (e: any) {
        return { status: 'error', error: e.message };
    }
  }

  private async fetchCryptoSnapshot() {
      try {
          const res = await axios.get('https://api.coingecko.com/stable/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true', { timeout: 5000 });
          return res.data;
      } catch (e) { return null; }
  }
}

export default new CryptoStockCorrelationService();
