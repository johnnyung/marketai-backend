import axios from 'axios';

const FMP_KEY = process.env.FMP_API_KEY;

interface IVMetrics {
  ticker: string;
  iv_rank: number;
  current_iv: number;
  skew: 'PUT_HEAVY' | 'CALL_HEAVY' | 'NEUTRAL';
  regime: 'CHEAP_VOL' | 'NORMAL' | 'EXPENSIVE_VOL' | 'FEAR_SPIKE';
  recommendation: string;
  confidence_modifier: number;
}

class IvNavigatorService {

  async analyzeIV(ticker: string): Promise<IVMetrics> {
    const result: IVMetrics = {
        ticker, iv_rank: 50, current_iv: 0, skew: 'NEUTRAL',
        regime: 'NORMAL', recommendation: 'Standard sizing', confidence_modifier: 0
    };

    if (!FMP_KEY) return result;

    try {
        // Using ATR as Volatility Proxy since real-time options chain is premium only
        const url = `https://financialmodelingprep.com/stable/technical_indicator/1day/${ticker}?type=atr&period=14&apikey=${FMP_KEY}`;
        const res = await axios.get(url, { timeout: 4000 });
        
        if (Array.isArray(res.data) && res.data.length > 250) {
            const currentATR = res.data[0].atr;
            const history = res.data.slice(0, 252).map((d: any) => d.atr);
            const minATR = Math.min(...history);
            const maxATR = Math.max(...history);
            
            const ivRank = maxATR === minATR ? 50 : ((currentATR - minATR) / (maxATR - minATR)) * 100;
            result.iv_rank = parseFloat(ivRank.toFixed(2));
            result.current_iv = currentATR;

            if (ivRank < 20) {
                result.regime = 'CHEAP_VOL';
                result.recommendation = 'Long Options viable.';
                result.confidence_modifier = 5;
            } else if (ivRank > 80) {
                result.regime = 'FEAR_SPIKE';
                result.recommendation = 'Sell Premium / Avoid Long Options.';
                result.confidence_modifier = -10;
            } else if (ivRank > 50) {
                result.regime = 'EXPENSIVE_VOL';
            }
        }
        return result;
    } catch (e) { return result; }
  }
}

export default new IvNavigatorService();
