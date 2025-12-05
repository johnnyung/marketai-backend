/**
 * BASE WEIGHTS CONFIGURATION
 * Represents the ideal weighting if all engines are firing.
 * Total should sum to 1.0 (100%), but Dynamic Scoring will handle deviations.
 */
export const ENGINE_WEIGHTS: Record<string, number> = {
    fsi: 0.20,       // Fundamentals (High Trust)
    ace: 0.15,       // Analyst Consensus
    insider: 0.10,   // Insider Activity
    gamma: 0.10,     // Options Gamma
    narrative: 0.10, // News/Sentiment
    macro: 0.10,     // Macro Environment
    volatility: 0.10,// Vol Surface/Risk
    ife: 0.05,       // Institutional Flow
    hfai: 0.05,      // Hedge Fund Activity
    seasonality: 0.05 // Historical Trend
};
