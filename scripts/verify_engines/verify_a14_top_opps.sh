#!/bin/bash

echo "============================================================"
echo "   MARKET_AI — VERIFY A14 TOP OPPORTUNITIES SNAPSHOT"
echo "============================================================"

# Ensure build exists
if [ ! -f "dist/services/tradingOpportunitiesService.js" ]; then
  echo "⚠️  dist/services/tradingOpportunitiesService.js missing — running build..."
  npm run build
fi

node --input-type=module << 'NODE_EOF'
import path from "path";
import fs from "fs";

const root = process.cwd();
const svcPath = path.join(root, "dist/services/tradingOpportunitiesService.js");

console.log("📍 Loading tradingOpportunitiesService from:", svcPath);

if (!fs.existsSync(svcPath)) {
  console.error("❌ Service file not found.");
  process.exit(1);
}

try {
  const mod = await import(svcPath);
  const svc = mod.default || mod;

  if (!svc || typeof svc.generateTradingSignals !== "function") {
    console.error("❌ generateTradingSignals() not found on default export.");
    console.error("   Available keys:", Object.keys(svc || {}));
    process.exit(1);
  }

  console.log("✅ generateTradingSignals() is available. Probing...");

  let signals = [];
  try {
    const res = await svc.generateTradingSignals();

    if (Array.isArray(res)) {
      signals = res;
    } else if (res && Array.isArray(res.signals)) {
      signals = res.signals;
    } else {
      console.warn("⚠️  Unexpected result shape from generateTradingSignals():");
      console.warn(res);
    }
  } catch (err) {
    console.error("❌ Error while calling generateTradingSignals():", err);
    process.exit(1);
  }

  console.log("📊 Signals total:", signals.length);

  if (!signals.length) {
    console.log("⚠️  No signals returned — engine may be filtering everything out.");
    process.exit(0);
  }

  // Try to sort by score / confidence-like fields if they exist
  const scoreKeys = ["score", "confidence", "probability", "strength"];
  function getScore(s) {
    for (const k of scoreKeys) {
      if (s && Object.prototype.hasOwnProperty.call(s, k)) {
        return s[k];
      }
    }
    return undefined;
  }

  const sorted = [...signals].sort((a, b) => {
    const sa = getScore(a);
    const sb = getScore(b);
    if (typeof sa === "number" && typeof sb === "number") return sb - sa;
    return 0;
  });

  const top = sorted.slice(0, 5);

  console.log("🔥 Top 5 snapshot:");
  for (const s of top) {
    const ticker = s.ticker || s.symbol || s.asset || "UNKNOWN";
    const score = getScore(s);
    const direction =
      s.direction || s.bias || s.side || s.view || "n/a";
    const timeframe = s.timeframe || s.horizon || "n/a";

    console.log(
      `  • ${ticker} | score=${score !== undefined ? score : "?"} | dir=${direction} | tf=${timeframe}`
    );
  }

  process.exit(0);
} catch (err) {
  console.error("❌ Critical error in A14 verifier:", err);
  process.exit(1);
}
NODE_EOF
