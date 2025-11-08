// backend/src/services/enhancedIntelligenceService.ts
// IMPROVED: Diverse sectors beyond FAANG
// NO EXTERNAL IMPORTS - All types defined inline

// ===== INLINE TYPE DEFINITIONS =====
interface OptionsFlow {
  symbol: string;
  timestamp: string;
  type: 'call' | 'put';
  strike: number;
  expiration: string;
  volume: number;
  openInterest: number;
  premium: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  unusual: boolean;
}

interface OptionsFlowSummary {
  totalVolume: number;
  callVolume: number;
  putVolume: number;
  putCallRatio: number;
  unusualActivity: OptionsFlow[];
  topSymbols: { symbol: string; volume: number; sentiment: string }[];
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  summary?: { message: string; recommendation: string };
  flows?: OptionsFlow[];
}

interface InsiderTransaction {
  symbol: string;
  insiderName: string;
  title: string;
  transactionType: 'buy' | 'sell';
  shares: number;
  pricePerShare: number;
  totalValue: number;
  filingDate: string;
  transactionDate: string;
  confidence: number;
}

interface InsiderActivitySummary {
  recentTransactions: InsiderTransaction[];
  significant: InsiderTransaction[];
  netActivity: 'buying' | 'selling' | 'neutral';
  overallSentiment: 'positive' | 'negative' | 'neutral';
  summary?: { alert?: string; message: string };
}

interface SocialSentimentSummary {
  trending: { symbol: string; mentions: number; sentiment: number; change24h: number }[];
  memeStocks: string[];
  score: number;
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  memeAlert?: { symbol: string; message: string }[];
}

interface EarningsEvent {
  symbol: string;
  companyName: string;
  date: string;
  time: 'BMO' | 'AMC';
  estimatedEPS: number;
  importance: 'high' | 'medium' | 'low';
  marketCap: number;
}

interface EarningsIntelligence {
  upcoming: EarningsEvent[];
  today: EarningsEvent[];
  thisWeek: EarningsEvent[];
  next7Days: EarningsEvent[];
  keyEarnings: EarningsEvent[];
  alert?: string;
}

interface TechnicalSignal {
  ticker: string;
  signal: string;
  confidence: number;
  price: number;
  indicator: string;
}

interface TechnicalSignals {
  breakouts: TechnicalSignal[];
  oversold: string[];
  overbought: string[];
  highVolume: { ticker: string; volumeRatio: number }[];
}

interface EnhancedIntelligenceData {
  optionsFlow: OptionsFlowSummary;
  insiderActivity: InsiderActivitySummary;
  socialSentiment: SocialSentimentSummary;
  earnings: EarningsIntelligence;
  technical: TechnicalSignals;
  timestamp: string;
}

// ===== SERVICE IMPLEMENTATION =====

// ✅ DIVERSE TICKER POOLS BY SECTOR
const TICKER_POOLS = {
  megaTech: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA'],
  growth: ['TSLA', 'AMD', 'PLTR', 'SNOW', 'CRWD', 'NET'],
  finance: ['JPM', 'BAC', 'GS', 'V', 'MA', 'BLK'],
  healthcare: ['UNH', 'JNJ', 'PFE', 'ABBV', 'LLY', 'MRK'],
  energy: ['XOM', 'CVX', 'COP', 'SLB', 'OXY'],
  consumer: ['WMT', 'COST', 'HD', 'TGT', 'NKE', 'SBUX'],
  industrial: ['CAT', 'BA', 'HON', 'GE', 'LMT'],
  meme: ['GME', 'AMC', 'BBBY', 'TSLA', 'PLTR'],
  etf: ['SPY', 'QQQ', 'IWM', 'DIA']
};

class EnhancedIntelligenceService {
  
  async getEnhancedIntelligence(): Promise<EnhancedIntelligenceData> {
    const [optionsFlow, insiderActivity, socialSentiment, earnings, technical] = await Promise.all([
      this.getOptionsFlow(),
      this.getInsiderActivity(),
      this.getSocialSentiment(),
      this.getEarnings(),
      this.getTechnicalSignals()
    ]);

    return {
      optionsFlow,
      insiderActivity,
      socialSentiment,
      earnings,
      technical,
      timestamp: new Date().toISOString()
    };
  }

  private async getOptionsFlow(): Promise<OptionsFlowSummary> {
    // ✅ Mix ETFs + diverse sectors
    const symbols = [
      ...TICKER_POOLS.etf,
      ...this.randomSample(TICKER_POOLS.megaTech, 3),
      ...this.randomSample(TICKER_POOLS.finance, 2),
      ...this.randomSample(TICKER_POOLS.healthcare, 2),
      ...this.randomSample(TICKER_POOLS.energy, 1)
    ];
    
    const flows: OptionsFlow[] = [];

    symbols.forEach(symbol => {
      const numFlows = Math.floor(Math.random() * 5) + 2;
      for (let i = 0; i < numFlows; i++) {
        const type = Math.random() > 0.5 ? 'call' : 'put';
        const volume = Math.floor(Math.random() * 15000) + 1000;
        flows.push({
          symbol,
          timestamp: new Date().toISOString(),
          type,
          strike: this.getStrike(symbol),
          expiration: this.getExpiration(),
          volume,
          openInterest: Math.floor(volume * (Math.random() * 2 + 0.5)),
          premium: Math.random() * 15 + 0.5,
          sentiment: type === 'call' ? 'bullish' : 'bearish',
          unusual: Math.random() > 0.85
        });
      }
    });

    const callVol = flows.filter(f => f.type === 'call').reduce((s, f) => s + f.volume, 0);
    const putVol = flows.filter(f => f.type === 'put').reduce((s, f) => s + f.volume, 0);
    const pcRatio = putVol / (callVol || 1);

    const unusual = flows.filter(f => f.unusual).sort((a, b) => b.volume - a.volume).slice(0, 8);
    
    const symbolMap = new Map();
    flows.forEach(f => {
      const curr = symbolMap.get(f.symbol) || { vol: 0, callVol: 0, putVol: 0 };
      curr.vol += f.volume;
      if (f.type === 'call') curr.callVol += f.volume;
      else curr.putVol += f.volume;
      symbolMap.set(f.symbol, curr);
    });

    const topSymbols = Array.from(symbolMap.entries())
      .map(([symbol, data]: [string, any]) => ({
        symbol,
        volume: data.vol,
        sentiment: data.callVol > data.putVol ? 'bullish' : 'bearish'
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 8);

    return {
      totalVolume: callVol + putVol,
      callVolume: callVol,
      putVolume: putVol,
      putCallRatio: pcRatio,
      unusualActivity: unusual,
      topSymbols,
      overallSentiment: pcRatio < 0.7 ? 'bullish' : pcRatio > 1.3 ? 'bearish' : 'neutral',
      flows,
      summary: {
        message: `P/C Ratio: ${pcRatio.toFixed(2)} - ${unusual.length} unusual flows detected`,
        recommendation: pcRatio < 0.7 ? 'Bullish options flow' : 'Elevated put activity'
      }
    };
  }

  private async getInsiderActivity(): Promise<InsiderActivitySummary> {
    // ✅ Diverse sectors for insider trades
    const symbols = [
      ...this.randomSample(TICKER_POOLS.megaTech, 2),
      ...this.randomSample(TICKER_POOLS.finance, 2),
      ...this.randomSample(TICKER_POOLS.healthcare, 2),
      ...this.randomSample(TICKER_POOLS.energy, 1),
      ...this.randomSample(TICKER_POOLS.consumer, 1)
    ];
    
    const transactions: InsiderTransaction[] = [];

    symbols.forEach(symbol => {
      const numTx = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numTx; i++) {
        const isBuy = Math.random() > 0.35;
        const shares = Math.floor(Math.random() * 100000) + 5000;
        const price = this.getPrice(symbol);
        const value = shares * price;
        let conf = 50;
        if (isBuy) conf += 20;
        if (shares > 50000) conf += 15;
        if (value > 1000000) conf += 10;

        transactions.push({
          symbol,
          insiderName: this.getName(),
          title: this.getTitle(),
          transactionType: isBuy ? 'buy' : 'sell',
          shares,
          pricePerShare: price,
          totalValue: value,
          filingDate: this.getDate(0, 7),
          transactionDate: this.getDate(1, 14),
          confidence: Math.min(100, conf)
        });
      }
    });

    const sorted = transactions.sort((a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime());
    const significant = sorted.filter(t => t.totalValue > 500000).slice(0, 10);
    const buyVal = transactions.filter(t => t.transactionType === 'buy').reduce((s, t) => s + t.totalValue, 0);
    const sellVal = transactions.filter(t => t.transactionType === 'sell').reduce((s, t) => s + t.totalValue, 0);

    let netActivity: 'buying' | 'selling' | 'neutral' = 'neutral';
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (buyVal > sellVal * 1.5) { netActivity = 'buying'; sentiment = 'positive'; }
    else if (sellVal > buyVal * 1.5) { netActivity = 'selling'; sentiment = 'negative'; }

    return {
      recentTransactions: sorted.slice(0, 15),
      significant,
      netActivity,
      overallSentiment: sentiment,
      summary: {
        alert: significant.length > 0 && significant[0].totalValue > 2000000 
          ? `Major insider ${significant[0].transactionType} in ${significant[0].symbol}: $${(significant[0].totalValue/1e6).toFixed(1)}M`
          : undefined,
        message: `${transactions.filter(t => t.transactionType === 'buy').length} buys, ${transactions.filter(t => t.transactionType === 'sell').length} sells`
      }
    };
  }

  private async getSocialSentiment(): Promise<SocialSentimentSummary> {
    // ✅ Mix meme stocks with growth stocks
    const symbols = [
      ...TICKER_POOLS.meme,
      ...this.randomSample(TICKER_POOLS.growth, 3)
    ];
    
    const trending = symbols.map(symbol => ({
      symbol,
      mentions: Math.floor(Math.random() * 10000) + 500,
      sentiment: Math.floor(Math.random() * 200) - 100,
      change24h: Math.floor(Math.random() * 200) - 100
    })).sort((a, b) => b.mentions - a.mentions).slice(0, 8);

    const memeStocks = trending.filter(t => t.mentions > 5000).map(t => t.symbol);
    const avgSentiment = trending.reduce((s, t) => s + t.sentiment, 0) / trending.length;

    return {
      trending,
      memeStocks,
      score: Math.round(avgSentiment),
      overallSentiment: avgSentiment > 30 ? 'bullish' : avgSentiment < -30 ? 'bearish' : 'neutral',
      memeAlert: memeStocks.length > 0 ? [{ 
        symbol: memeStocks[0], 
        message: `${memeStocks[0]} trending with ${trending[0].mentions.toLocaleString()} mentions` 
      }] : undefined
    };
  }

  private async getEarnings(): Promise<EarningsIntelligence> {
    // ✅ Diverse sectors for earnings
    const companies = [
      { symbol: 'AAPL', name: 'Apple Inc.', cap: 3000, imp: 'high' },
      { symbol: 'MSFT', name: 'Microsoft', cap: 2800, imp: 'high' },
      { symbol: 'JPM', name: 'JPMorgan Chase', cap: 450, imp: 'high' },
      { symbol: 'UNH', name: 'UnitedHealth', cap: 500, imp: 'high' },
      { symbol: 'XOM', name: 'Exxon Mobil', cap: 400, imp: 'medium' },
      { symbol: 'WMT', name: 'Walmart', cap: 450, imp: 'high' },
      { symbol: 'NVDA', name: 'NVIDIA', cap: 1200, imp: 'high' },
      { symbol: 'V', name: 'Visa', cap: 500, imp: 'medium' },
      { symbol: 'HD', name: 'Home Depot', cap: 350, imp: 'medium' },
      { symbol: 'CAT', name: 'Caterpillar', cap: 150, imp: 'medium' }
    ];

    const events: EarningsEvent[] = companies.map(c => ({
      symbol: c.symbol,
      companyName: c.name,
      date: this.getEarningsDate(),
      time: Math.random() > 0.5 ? 'BMO' : 'AMC',
      estimatedEPS: Math.random() * 5,
      importance: c.imp as any,
      marketCap: c.cap
    }));

    const today = new Date().toISOString().split('T')[0];
    const todayEvents = events.filter(e => e.date === today);
    const thisWeek = events.filter(e => this.isThisWeek(e.date));
    const next7 = events.filter(e => this.isNext7Days(e.date));

    return {
      upcoming: events,
      today: todayEvents,
      thisWeek,
      next7Days: next7,
      keyEarnings: events.filter(e => e.importance === 'high'),
      alert: next7.length > 0 ? `${next7.length} earnings reports in next 7 days` : undefined
    };
  }

  private async getTechnicalSignals(): Promise<TechnicalSignals> {
    // ✅ Diverse sectors for technical analysis
    const symbols = [
      ...this.randomSample(TICKER_POOLS.megaTech, 2),
      ...this.randomSample(TICKER_POOLS.finance, 2),
      ...this.randomSample(TICKER_POOLS.healthcare, 1),
      ...this.randomSample(TICKER_POOLS.energy, 1),
      ...this.randomSample(TICKER_POOLS.consumer, 1)
    ];
    
    const breakouts: TechnicalSignal[] = [];
    const oversold: string[] = [];
    const overbought: string[] = [];
    const highVol: { ticker: string; volumeRatio: number }[] = [];

    symbols.forEach(symbol => {
      const rsi = Math.random() * 100;
      const volRatio = Math.random() * 3 + 0.5;

      if (rsi < 30) oversold.push(symbol);
      if (rsi > 70) overbought.push(symbol);
      if (volRatio > 2) highVol.push({ ticker: symbol, volumeRatio: volRatio });

      if (Math.random() > 0.7) {
        breakouts.push({
          ticker: symbol,
          signal: 'Breakout above resistance',
          confidence: Math.floor(Math.random() * 30) + 70,
          price: this.getPrice(symbol),
          indicator: 'Price Action'
        });
      }
    });

    return { breakouts, oversold, overbought, highVolume: highVol };
  }

  private randomSample<T>(arr: T[], count: number): T[] {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  private getStrike(s: string): number {
    const prices: Record<string, number> = {
      SPY: 450, QQQ: 380, IWM: 200, DIA: 350,
      AAPL: 180, MSFT: 380, GOOGL: 140, AMZN: 170, META: 350, NVDA: 500,
      TSLA: 250, AMD: 150, PLTR: 25, SNOW: 150, CRWD: 250, NET: 80,
      JPM: 150, BAC: 35, GS: 400, V: 250, MA: 450, BLK: 850,
      UNH: 500, JNJ: 160, PFE: 30, ABBV: 170, LLY: 800, MRK: 100,
      XOM: 110, CVX: 150, COP: 120, SLB: 50, OXY: 60,
      WMT: 60, COST: 700, HD: 350, TGT: 150, NKE: 100, SBUX: 100,
      CAT: 350, BA: 180, HON: 200, GE: 150, LMT: 500
    };
    const base = prices[s] || 100;
    return Math.round(base * (1 + (Math.random() - 0.5) * 0.2));
  }

  private getExpiration(): string {
    const dates = ['2024-12-20', '2025-01-17', '2025-02-21', '2025-03-21', '2025-06-20'];
    return dates[Math.floor(Math.random() * dates.length)];
  }

  private getPrice(s: string): number {
    const prices: Record<string, number> = {
      AAPL: 180, MSFT: 380, GOOGL: 140, AMZN: 170, META: 350, NVDA: 500,
      TSLA: 250, AMD: 150, PLTR: 25, SNOW: 150, CRWD: 250, NET: 80,
      JPM: 150, BAC: 35, GS: 400, V: 250, MA: 450, BLK: 850,
      UNH: 500, JNJ: 160, PFE: 30, ABBV: 170, LLY: 800, MRK: 100,
      XOM: 110, CVX: 150, COP: 120, SLB: 50, OXY: 60,
      WMT: 60, COST: 700, HD: 350, TGT: 150, NKE: 100, SBUX: 100,
      CAT: 350, BA: 180, HON: 200, GE: 150, LMT: 500,
      GME: 20, AMC: 5, BBBY: 1
    };
    const base = prices[s] || 100;
    return Math.round((base + (Math.random() - 0.5) * 20) * 100) / 100;
  }

  private getName(): string {
    const first = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa'];
    const last = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];
    return `${first[Math.floor(Math.random() * first.length)]} ${last[Math.floor(Math.random() * last.length)]}`;
  }

  private getTitle(): string {
    return ['CEO', 'CFO', 'CTO', 'Director', 'SVP', 'EVP', 'President'][Math.floor(Math.random() * 7)];
  }

  private getDate(min: number, max: number): string {
    const days = Math.floor(Math.random() * (max - min + 1)) + min;
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  }

  private getEarningsDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + Math.floor(Math.random() * 14));
    return d.toISOString().split('T')[0];
  }

  private isThisWeek(date: string): boolean {
    const d = new Date(date);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return d >= now && d <= weekFromNow;
  }

  private isNext7Days(date: string): boolean {
    return this.isThisWeek(date);
  }
}

export default new EnhancedIntelligenceService();
