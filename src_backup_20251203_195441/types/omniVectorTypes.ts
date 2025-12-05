export interface OmniVectorSnapshot {
  ticker: string;
  asOf: string;
  price?: number | null;
  changePercent?: number | null;
  marketCap?: number | null;
  peRatio?: number | null;
  sector?: string | null;
  industry?: string | null;

  fundamentals?: {
    revenueGrowthYoY?: number | null;
    netMargin?: number | null;
    debtToEquity?: number | null;
  };

  sentiment?: {
    score: number;
    mentions: number;
    positive: number;
    negative: number;
    neutral: number;
    sources: { yahoo: number; marketWatch: number; reddit: number; houseTrades: number };
    latestHeadlines: { title: string; source: string; pubDate?: string }[];
  };

  highlights?: {
    newsCount: number;
    govEvents: {
      secFilings: number;
      houseTrades: number;
      fedRegisterDocs: number;
    };
  };

  raw?: {
    latestNewsTitles: string[];
    latestHouseTradeSummaries: string[];
  };
}
