/**
 * Utility Methods for Technical Analysis Signal Generation
 * ---------------------------------------------------------
 */

export function normalizeIndicator(value: any, defaultValue: number = 50): number {
    if (value === null || value === undefined || isNaN(value)) return defaultValue;
    return Number(value);
}

/**
 * generateSignals()
 * ---------------------------------------------------------
 * indicators: { rsi, sma50, sma200, trendScore, volatilityScore }
 * patterns:   string[]
 */
export function generateSignals(indicators: any, patterns: string[]): string[] {
    const signals: string[] = [];

    const rsi = normalizeIndicator(indicators.rsi);
    const sma50 = normalizeIndicator(indicators.sma50);
    const sma200 = normalizeIndicator(indicators.sma200);

    // RSI Logic
    if (rsi < 30) signals.push("RSI Oversold");
    else if (rsi > 70) signals.push("RSI Overbought");

    // SMA Trend Logic
    if (sma50 > sma200) signals.push("Golden Cross Bias");
    else if (sma50 < sma200) signals.push("Death Cross Bias");

    // Pattern-based signals
    patterns.forEach(p => {
        if (p.toLowerCase().includes("bull")) signals.push("Bullish Pattern");
        if (p.toLowerCase().includes("bear")) signals.push("Bearish Pattern");
    });

    return signals;
}

/**
 * generateRecommendation()
 * ---------------------------------------------------------
 * Converts indicators + patterns → "STRONG BUY" / "BUY" / "HOLD" / "SELL"
 */
export function generateRecommendation(indicators: any, patterns: string[]): string {
    let score = 50;

    const rsi = normalizeIndicator(indicators.rsi);
    const sma50 = normalizeIndicator(indicators.sma50);
    const sma200 = normalizeIndicator(indicators.sma200);

    // RSI scoring
    if (rsi < 30) score += 15;
    if (rsi > 70) score -= 15;

    // Trend scoring
    if (sma50 > sma200) score += 10;
    else score -= 10;

    // Pattern scoring
    patterns.forEach(p => {
        if (p.toLowerCase().includes("bull")) score += 10;
        if (p.toLowerCase().includes("bear")) score -= 10;
    });

    // Recommendation bands
    if (score >= 75) return "STRONG BUY";
    if (score >= 60) return "BUY";
    if (score >= 45) return "HOLD";
    if (score >= 30) return "SELL";
    return "STRONG SELL";
}
