// ============================================================
// FINAL — FMP Stable Quote Fetcher (100% Correct for New Keys)
// ============================================================

import dotenv from "dotenv";
import { FMP_STABLE_URL } from "./fmpStableWrapper.js";

dotenv.config();
const API_KEY = process.env.FMP_API_KEY;

/**
 * Fetch quote using official Stable endpoint:
 *   /stable/quote?symbol=AAPL
 */
export async function getStableQuote(ticker: string) {
  const url = FMP_STABLE_URL(
    `/quote?symbol=${ticker}&apikey=${API_KEY}`
  );

  console.log("🌐 Fetching:", url);

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Stable FMP returned ${res.status} for ${ticker}`);
  }

  const data = await res.json();
  console.log("📦 Raw stable quote:", data);

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  return data[0]; // { symbol, price, changesPercentage, ... }
}

/**
 * Return price number directly.
 */
export async function getStablePrice(ticker: string): Promise<number | null> {
  try {
    const q = await getStableQuote(ticker);
    if (!q || !q.price) {
      console.log(`⚠️ Missing price for ${ticker}`, q);
      return null;
    }
    return q.price;
  } catch (err) {
    console.error("❌ Error inside getStablePrice:", err);
    return null;
  }
}
