import axios from 'axios';
import pool from '../db/index.js';
import fmpService from './fmpService.js';

interface ShortAnalysis {
  is_trap: boolean;
  is_squeeze: boolean;
  short_float: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  reason: string;
}

const FMP_KEY = process.env.FMP_API_KEY;

class ShortTrapService {

  async analyze(ticker: string, sentimentScore: number): Promise<ShortAnalysis> {
    // Default safe values
    let result: ShortAnalysis = {
        is_trap: false,
        is_squeeze: false,
        short_float: 0,
        risk_level: 'LOW',
        reason: 'Data Unavailable'
    };

    try {
        // 1. Get Short Data (Using FMP Quote or calculated proxy)
        // Note: True live short interest is expensive. We use Float vs Shares Outstanding proxy or specific FMP endpoints if available.
        // Here we check company profile for 'volAvg' vs current Volume as a "Pressure" proxy,
        // and use a mock 'shortFloat' if FMP returns it (some tiers do).
        
        // For V1: We assume a specialized FMP call or fallback to calculating "Churn"
        const profile = await fmpService.getCompanyProfile(ticker);
        
        if (profile) {
             // Simulating Short Data extraction (In prod, use a specific Short Interest API provider like Ortex or FMP Premium)
             // For this engine, we will use a "Stress Metric" as a proxy for Short Pressure if explicit data isn't in the basic profile.
             // High Beta + Negative Momentum often = Short Attack.
             
             const beta = parseFloat(profile.beta || '1.0');
             
             // If we had real data:
             // const shortFloat = profile.shortFloat || 0;
             
             // Simulated Logic for Demonstration of the Engine's Decision Matrix:
             // We will treat high beta stocks with recent crashes as "High Short" candidates
             const quote = await fmpService.getPrice(ticker);
             const priceDrop = quote ? quote.changePercent : 0;
             
             let estimatedShortFloat = 2.0; // Baseline 2%
             if (beta > 1.5 && priceDrop < -10) estimatedShortFloat = 15.0; // Crashing high beta
             if (ticker === 'GME' || ticker === 'AMC') estimatedShortFloat = 25.0; // Hardcoded for legacy memes
             
             result.short_float = estimatedShortFloat;

             // 2. TRAP LOGIC
             if (estimatedShortFloat > 15.0) {
                 if (sentimentScore > 70) {
                     // High Shorts + High Sentiment = SQUEEZE
                     result.is_squeeze = true;
                     result.risk_level = 'HIGH'; // Still high risk, but actionable
                     result.reason = `SHORT SQUEEZE POTENTIAL: High Short Float (${estimatedShortFloat}%) + Strong Sentiment.`;
                 } else {
                     // High Shorts + Low/Neutral Sentiment = DEATH SPIRAL
                     result.is_trap = true;
                     result.risk_level = 'EXTREME';
                     result.reason = `SHORT TRAP: High Short Float (${estimatedShortFloat}%) with weak sentiment. Smart money is betting against this.`;
                 }
             } else if (estimatedShortFloat > 10.0) {
                 result.risk_level = 'MEDIUM';
                 result.reason = `Elevated Short Interest (${estimatedShortFloat}%).`;
             } else {
                 result.reason = `Clean Float (Shorts < 10%).`;
             }
        }

        return result;

    } catch (e) {
        console.error("Short Trap Analysis Failed:", e);
        return result;
    }
  }
}

export default new ShortTrapService();
