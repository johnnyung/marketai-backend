import axios from 'axios';
import pool from '../db/index.js';
import marketDataService from './marketDataService.js';

const FMP_KEY = process.env.FMP_API_KEY;

interface OptionsAlert {
  ticker: string;
  type: 'CALL_SWEEP' | 'PUT_SWEEP' | 'GAMMA_SQUEEZE' | 'UNUSUAL_VOL';
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  details: string;
  score: number; // 0-100 Impact Score
}

class OptionsRadarService {

  async scanFlows(): Promise<OptionsAlert[]> {
    console.log('      📡 Options Radar: Scanning for Unusual Activity...');
    
    const alerts: OptionsAlert[] = [];

    if (!FMP_KEY) {
        return this.getSimulatedAlerts("No API Key");
    }

    try {
        // STRATEGY 1: Try FMP Unusual Activity (Premium)
        // We use a short timeout to fail fast if blocked
        const uaUrl = `https://financialmodelingprep.com/stable/option_unusual_activity?apikey=${FMP_KEY}&limit=20`;
        const uaRes = await axios.get(uaUrl, { timeout: 4000 });
        
        if (Array.isArray(uaRes.data) && uaRes.data.length > 0) {
            for (const opt of uaRes.data) {
                if (opt.volume > opt.openInterest && opt.volume > 1000) {
                    const isCall = opt.type === 'call';
                    const type = isCall ? 'CALL_SWEEP' : 'PUT_SWEEP';
                    const sentiment = isCall ? 'BULLISH' : 'BEARISH';
                    
                    alerts.push({
                        ticker: opt.symbol,
                        type,
                        sentiment,
                        details: `${type}: ${opt.volume} Vol > ${opt.openInterest} OI. Strike $${opt.strikePrice}.`,
                        score: 85
                    });
                    await this.saveAlert(opt.symbol, type, sentiment, opt.strikePrice, `Vol: ${opt.volume}, OI: ${opt.openInterest}`);
                }
            }
            return alerts; // Success!
        }
    } catch(e: any) {
        // 403 means plan restriction. 404 means endpoint moved.
        // In either case, we fallback to "Implied Volatility Proxy"
        // console.warn(`      ⚠️ Options API Restricted (${e.response?.status}). Using Volatility Proxy.`);
    }

    // STRATEGY 2: Implied Volatility Proxy (Fallback)
    // If we can't get real options data, we look for stocks with high volume + high volatility
    // This is a strong proxy for "Gamma Squeeze" conditions.
    try {
        const activeUrl = `https://financialmodelingprep.com/stable/stock/actives?apikey=${FMP_KEY}`;
        const activeRes = await axios.get(activeUrl, { timeout: 4000 });
        
        if (Array.isArray(activeRes.data)) {
            for (const stock of activeRes.data.slice(0, 5)) {
                if (stock.changesPercentage > 5) {
                    alerts.push({
                        ticker: stock.symbol,
                        type: 'GAMMA_SQUEEZE',
                        sentiment: 'BULLISH',
                        details: `High Velocity Move (+${stock.changesPercentage.toFixed(2)}%). Implies Call Buying.`,
                        score: 75
                    });
                } else if (stock.changesPercentage < -5) {
                     alerts.push({
                        ticker: stock.symbol,
                        type: 'PUT_SWEEP',
                        sentiment: 'BEARISH',
                        details: `High Velocity Drop (${stock.changesPercentage.toFixed(2)}%). Implies Put Buying.`,
                        score: 75
                    });
                }
            }
        }
    } catch (e) {
        return this.getSimulatedAlerts("Data Source Failure");
    }

    return alerts.length > 0 ? alerts : this.getSimulatedAlerts("Low Activity");
  }

  // Fallback data for display
  private getSimulatedAlerts(reason: string): OptionsAlert[] {
      return [
          { ticker: 'NVDA', type: 'CALL_SWEEP', sentiment: 'BULLISH', details: `Simulated: High Call Volume (${reason})`, score: 80 },
          { ticker: 'TSLA', type: 'PUT_SWEEP', sentiment: 'BEARISH', details: `Simulated: Bearish Puts Detected (${reason})`, score: 75 }
      ];
  }

  private async saveAlert(ticker: string, type: string, sentiment: string, strike: number, desc: string) {
      try {
          await pool.query(`
            INSERT INTO options_alerts (ticker, alert_type, sentiment, strike_price, description, detected_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
          `, [ticker, type, sentiment, strike, desc]);
      } catch(e) {}
  }

  async checkTicker(ticker: string): Promise<OptionsAlert | null> {
      try {
          const res = await pool.query(`
            SELECT * FROM options_alerts 
            WHERE ticker = $1 
            AND detected_at > NOW() - INTERVAL '24 hours'
            ORDER BY detected_at DESC LIMIT 1
          `, [ticker]);
          
          if (res.rows.length > 0) {
              const r = res.rows[0];
              return {
                  ticker: r.ticker,
                  type: r.alert_type as any,
                  sentiment: r.sentiment as any,
                  details: r.description,
                  score: 80
              };
          }
      } catch(e) {}
      return null;
  }
}

export default new OptionsRadarService();
