import { OmniVectorSnapshot } from '../types/omniVectorTypes.js';
import priceService from './priceService.js';
import fmpService from './fmpService.js';
import sentimentService from './sentimentService.js';
import tickerUniverseService from './tickerUniverseService.js';
import newsProvider from './providers/newsProvider.js';
import govProvider from './providers/govProvider.js';

class OmniVectorService {

  private async safePromise<T>(promise: Promise<T>, fallback: T): Promise<T> {
    try {
      return await promise;
    } catch (e) {
      return fallback;
    }
  }

  async buildSnapshotForTicker(rawTicker: string): Promise<OmniVectorSnapshot> {
    const ticker = rawTicker.toUpperCase();
    const snapshot: OmniVectorSnapshot = {
      ticker,
      asOf: new Date().toISOString(),
      price: null,
      changePercent: null,
      marketCap: null,
      peRatio: null,
      sector: null,
      industry: null,
      fundamentals: { revenueGrowthYoY: null, netMargin: null, debtToEquity: null },
      sentiment: undefined,
      highlights: {
        newsCount: 0,
        govEvents: { secFilings: 0, houseTrades: 0, fedRegisterDocs: 0 }
      },
      raw: { latestNewsTitles: [], latestHouseTradeSummaries: [] }
    };

    try {
      // 1. PARALLEL DATA FETCH
      // We run independent blocks so failures don't cascade
      const [
        priceData,
        profileData,
        metricsData,
        ratiosData,
        sentimentData,
        unifiedNews,
        houseTrades,
        senateTrades
      ] = await Promise.all([
        this.safePromise(priceService.getCurrentPrice(ticker), null),
        this.safePromise(fmpService.getCompanyProfile(ticker), null),
        this.safePromise(fmpService.getKeyMetrics(ticker), []),
        this.safePromise(fmpService.getFinancialRatios(ticker), []),
        this.safePromise(sentimentService.buildTickerSentimentSnapshot([ticker]), []),
        this.safePromise(newsProvider.getUnifiedNews(), []),
        this.safePromise(govProvider.getHouseTradingData(), []),
        this.safePromise(govProvider.getSenateTradingData(), [])
      ]);

      // 2. POPULATE MARKET DATA
      if (priceData && typeof priceData.price === 'number') {
        snapshot.price = priceData.price;
        snapshot.changePercent = priceData.changePercent;
      }

      // 3. POPULATE PROFILE
      if (profileData) {
        snapshot.marketCap = profileData.mktCap || null;
        snapshot.sector = profileData.sector || null;
        snapshot.industry = profileData.industry || null;
      }

      // 4. POPULATE FUNDAMENTALS
      // getKeyMetrics usually returns array, take first
      if (metricsData && metricsData.length > 0) {
        snapshot.peRatio = metricsData[0].peRatio || null;
        // Some metrics might be here depending on FMP endpoint version
      }
      if (ratiosData && ratiosData.length > 0) {
        snapshot.fundamentals = {
          revenueGrowthYoY: null, // Often in 'financial-growth', skip if not in ratios
          netMargin: ratiosData[0].netProfitMargin || null,
          debtToEquity: ratiosData[0].debtEquityRatio || null
        };
      }

      // 5. POPULATE SENTIMENT
      if (sentimentData && sentimentData.length > 0) {
        snapshot.sentiment = sentimentData[0];
      }

      // 6. POPULATE HIGHLIGHTS & RAW (Filtering)
      // Filter Unified News
      const tickerNews = unifiedNews.filter(n => 
        (n.title && n.title.toUpperCase().includes(ticker)) || 
        (n.link && n.link.toUpperCase().includes(ticker))
      );
      
      snapshot.highlights!.newsCount = tickerNews.length;
      snapshot.raw!.latestNewsTitles = tickerNews.slice(0, 10).map(n => n.title);

      // Filter Gov Trades
      // houseTrades structure varies, checking logical fields
      const relevantHouse = houseTrades.filter((t: any) => 
        t.ticker === ticker || t.asset_description?.toUpperCase().includes(ticker)
      );
      
      snapshot.highlights!.govEvents.houseTrades = relevantHouse.length;
      snapshot.raw!.latestHouseTradeSummaries = relevantHouse.slice(0, 5).map((t: any) => 
        `${t.representative} (${t.type}): ${t.amount}`
      );

    } catch (error) {
      console.warn(`[OmniVector] Partial failure building snapshot for ${ticker}`, error);
    }

    return snapshot;
  }

  async buildSnapshotsForUniverse(limit: number = 50): Promise<OmniVectorSnapshot[]> {
    try {
      const universe = await tickerUniverseService.getUniverse();
      const targets = universe.slice(0, limit);
      const results: OmniVectorSnapshot[] = [];
      
      // Batch in chunks of 5 to be polite to APIs
      const CHUNK_SIZE = 5;
      for (let i = 0; i < targets.length; i += CHUNK_SIZE) {
        const chunk = targets.slice(i, i + CHUNK_SIZE);
        const promises = chunk.map(t => this.buildSnapshotForTicker(t));
        const chunkResults = await Promise.all(promises);
        
        // Filter empty/dead results
        const valid = chunkResults.filter(r => 
          r.price !== null || 
          (r.sentiment && r.sentiment.mentions > 0) ||
          (r.highlights && r.highlights.newsCount > 0)
        );
        
        results.push(...valid);
      }

      return results;
    } catch (e) {
      console.error('[OmniVector] Universe build failed:', e);
      return [];
    }
  }
}

export default new OmniVectorService();
