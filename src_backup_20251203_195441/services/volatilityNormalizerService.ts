import marketDataService from './marketDataService.js';

interface NormalizationResult {
  original_score: number;
  adjusted_score: number;
  vix_level: number;
  multiplier: number;
  note: string;
}

class VolatilityNormalizerService {

  async normalize(confidence: number): Promise<NormalizationResult> {
    // 1. Fetch VIX
    // Using Yahoo/FMP fallback logic in marketDataService for indices
    let vix = 15.0; // Default "Normal" if fetch fails
    try {
        const quote = await marketDataService.getStockPrice('^VIX');
        if (quote && quote.price > 0) {
            vix = quote.price;
        }
    } catch (e) {
        // Fallback: Try simple VIX ticker
        try {
            const quote = await marketDataService.getStockPrice('VIX');
            if (quote && quote.price > 0) vix = quote.price;
        } catch(e2) {
            console.warn("   ⚠️ VIX Fetch Failed, assuming normal volatility (15).");
        }
    }

    // 2. Determine Multiplier
    let multiplier = 1.0;
    let regime = "Calm";

    if (vix < 20) {
        multiplier = 1.0;
        regime = "Calm";
    } else if (vix >= 20 && vix < 30) {
        multiplier = 0.9;
        regime = "Elevated";
    } else if (vix >= 30 && vix < 40) {
        multiplier = 0.75;
        regime = "High";
    } else {
        multiplier = 0.5;
        regime = "Extreme";
    }

    // 3. Calculate
    const adjusted = Math.round(confidence * multiplier);
    
    // 4. Construct Feedback
    const note = multiplier < 1.0
        ? `[VOLATILITY DAMPENER] VIX ${vix.toFixed(1)} (${regime}). Confidence reduced by ${Math.round((1-multiplier)*100)}%.\n`
        : "";

    if (multiplier < 1.0) {
        console.log(`      📉 Volatility Normalizer: Score ${confidence} -> ${adjusted} (VIX: ${vix})`);
    }

    return {
        original_score: confidence,
        adjusted_score: adjusted,
        vix_level: vix,
        multiplier,
        note
    };
  }
}

export default new VolatilityNormalizerService();
