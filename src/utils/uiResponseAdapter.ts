import { IntelligenceBundle } from '../types/intelligenceBundle.js';

/**
 * UFBC v2.0 - Universal UI Adapter
 * Supports "Card Mode" (Top 3) and "Details Mode" (Deep Dive).
 * Fills both 'price_data' and 'market_data' fields for frontend compatibility.
 */

// 1. Adapter for List Items / Top 3 Cards
export const adaptForTopPicks = (bundle: IntelligenceBundle) => {
    if (!bundle) return null;

    const price = bundle.price_data?.current || 0;
    const score = bundle.scoring?.weighted_confidence || 0;
    
    // COMPATIBILITY LAYER: Provide multiple field names for legacy frontend
    return {
        // ID & Meta
        ticker: bundle.ticker,
        company_name: bundle.ticker, // TODO: Add name to bundle
        sector: bundle.sector,
        
        // Scores (Superset)
        score: Math.round(score),
        confidence_score: Math.round(score), // Legacy alias
        
        // Signals
        conviction: bundle.scoring?.final_conviction || 'NEUTRAL',
        signal: (bundle.scoring?.final_conviction === 'MAXIMUM' || bundle.scoring?.final_conviction === 'HIGH') ? 'BUY' : 'HOLD',
        reason: bundle.scoring?.primary_driver || 'Automated Analysis',
        
        // Price (Superset)
        current_price: price,
        price: price, // Legacy alias
        market_data: {
            price: price,
            volume: 0,
            change: 0
        },

        // Plan
        trade_plan: bundle.trade_plan,
        
        // Summary Analysis (Flattened)
        sub_engines: {
            fsi: bundle.engines?.fsi?.score || 0,
            sentiment: bundle.engines?.narrative?.score || 0,
            insider: bundle.engines?.insider?.score || 0
        },

        generated_at: bundle.generated_at
    };
};

// 2. Adapter for Full Detail View
export const adaptForDetails = (bundle: IntelligenceBundle) => {
    if (!bundle) return null;
    
    // Inherit base props
    const base = adaptForTopPicks(bundle);

    return {
        ...base,
        // Preserve full engine nesting for deep dives
        engines: bundle.engines,
        scoring: bundle.scoring,
        meta: bundle.meta,
        learning: bundle.learning,
        
        // Extra Compatibility
        analysis: {
            summary: bundle.engines?.fsi?.details || 'No Data',
            bull_case: [],
            bear_case: []
        }
    };
};

// 3. Universal Normalizer (Defaults to Details)
export const normalizeIntelligenceBundle = (bundle: IntelligenceBundle | null) => {
    if (!bundle) return { error: 'No Data' };
    return adaptForDetails(bundle);
};

// 4. Portfolio Adapter
export const adaptForPortfolio = (position: any, bundle: IntelligenceBundle) => {
    const details = adaptForDetails(bundle);
    if (!details) return null;

    return {
        ...details,
        position_id: position.id,
        shares: position.shares,
        avg_cost: position.entry_price,
        market_value: position.shares * (details.current_price || 0),
        unrealized_pnl: (position.shares * (details.current_price || 0)) - (position.shares * position.entry_price)
    };
};
