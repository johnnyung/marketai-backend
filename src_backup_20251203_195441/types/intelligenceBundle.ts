import { TradePlan } from '../services/tradeArchitectService.js';

export interface PressureMetrics {
    ticker: string;
    pressure_score: number;
    regime: 'HYPE_CYCLE' | 'PANIC_CYCLE' | 'NEGLECTED' | 'NORMAL';
    dominant_narrative: string;
    sources_breakdown: {
        social_velocity: number;
        news_volume: number;
        political_heat: number;
        institutional_urgency: number;
    };
}

export interface GNAESignal {
    global_attention_score: number;
    dom_region: string;
    dom_sector: string;
    regions: { us: number; eu: number; asia: number };
    sectors: { tech: number; energy: number; finance: number; healthcare: number };
    dominant_region: string;
    dominant_sector: string;
}

// Re-export core interface
export interface IntelligenceBundle {
  ticker: string;
  sector: string;
  price_data: {
    current: number;
    open: number;
    volatility_profile: 'High' | 'Medium' | 'Low';
  };
  
  engines: {
    fsi: { score: number; traffic_light: 'RED' | 'YELLOW' | 'GREEN'; details: any; metrics?: any };
    ace: { street_score: number; rating: string; status: string; upside: number; details: string[] };
    ife: { conviction: number; bias: string; ownership: number; details: string[] };
    gmf: { score: number; inflation: string; growth: string; liquidity: string };
    carm: { score: number; regime: string; drivers: string[] };
    cae: { score: number; events: any; details: string[] };
    scs: { score: number; regime: string; pmi: number; details: string[] };
    bbm: { score: number; yield: number; action: string; details: string[] };
    mlp: { score: number; regime: string; trend: string; details: string[] };
    ofi: { score: number; net_prem: number; ratio: number; burst: boolean; details: string[] };
    hfai: { score: number; sentiment: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL'; whales: { buy: string[]; sell: string[] }; details: string[] };
    iat: { score: number; alpha: number; top_insider: string | null; validity: 'HIGH_VALUE' | 'NOISE' | 'NEUTRAL'; details: string[] };
    seas: { score: number; month: string; avg_return: number; win_rate: number; trend: string; details: string[] };
    volsurf: { skew: number; iv_rank: number; breakout: number; regime: string; details: string[] };
    iof: { pressure: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL'; net_flow: number; blocks: number; details: string[] };
    gnae: GNAESignal;
    hapde: { detected: boolean; pattern: string; signal: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL'; confidence: number; details: string[] };
    dve: { score: number; band: 'DEEP_VALUE' | 'UNDERVALUED' | 'FAIR' | 'OVERVALUED' | 'BUBBLE'; fair_value: number; upside: number; metrics: { pe: number; peg: number; fcf_yield: number }; details: string[] };
    ipe: { score: number; classification: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL' | 'MIXED'; cluster: boolean; chain: boolean; details: string[] };
    mbe: { score: number; regime: string; thrust: boolean; details: string[] };
    vre: { regime: 'LOW_VOL' | 'NORMAL' | 'HIGH_VOL' | 'EXTREME' | 'UNKNOWN'; factors: { stop_mult: number; size_mult: number; aggressiveness: string }; vix: number };
    uoa: { score: number; sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; metrics: { call_put_ratio: number; net_premium_flow: number; iv_rank: number; gamma_squeeze_risk: string }; anomalies: string[] };
    correlation: { score: number; regime: 'COUPLED' | 'DECOUPLED' | 'INVERSE' | 'STRESS_BREAK'; lead_lag: 'LEADING' | 'LAGGING' | 'NEUTRAL'; crypto_beta: number; details: string[] };
    gamma: { regime: string; exposure: number };
    insider: { classification: string; score: number };
    narrative: { score: number; regime: string };
    shadow: { bias: string; score: number };
    regime: { current: string; favored: boolean };
    agents: { consensus: string; breakdown: any };
    catalyst: { detected: boolean; type: string } | null;
    volatility: { regime: string; vix_level: number };
    divergence: { detected: boolean; type: string };
  };

  learning: {
    evolution_bias: number;
    drift_correction: number;
    attribution_weights: Record<string, number>;
    blind_spot_warning: boolean;
  };

  scoring: {
    raw_confidence: number;
    weighted_confidence: number;
    final_conviction: 'MAXIMUM' | 'HIGH' | 'MODERATE' | 'LOW' | 'AVOID';
    primary_driver: string;
    reasons: string[];
  };

  trade_plan: TradePlan;
  
  meta: {
      system_health: number;
      warning: boolean;
      generated_at?: string;
  };

  generated_at: string;
  version: string;
}
