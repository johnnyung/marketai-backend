#!/bin/bash
set -e

echo "============================================"
echo "   MARKETAI — FIXING HEALTH ROUTE"
echo "============================================"

ROOT="$HOME/Desktop/marketai-backend"
cd "$ROOT"

echo "🔧 Overwriting src/routes/health.ts ..."

cat > src/routes/health.ts << 'EOTS'
import { Router, Request, Response } from "express";

const router = Router();

const healthHandler = (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "marketai-backend",
    mode: process.env.NODE_ENV || "unknown",
    timestamp: new Date().toISOString(),
  });
};

// ✅ Primary endpoint: /api/health
router.get("/", healthHandler);

// ✅ Extra alias: /api/health/health (just in case anything calls it)
router.get("/health", healthHandler);

export default router;
EOTS

echo "✅ src/routes/health.ts updated"

echo "🔧 Rebuilding backend..."
npm run build

echo "============================================"
echo "   ✅ HEALTH ROUTE FIXED LOCALLY"
echo "   NEXT: git add/commit/push for Railway"
echo "============================================"
