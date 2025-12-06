#!/bin/bash
set -e

echo "==============================================="
echo "  MARKETAI — REGENERATE CLEAN server.ts"
echo "==============================================="

BACKEND_DIR="$(pwd)"

if [ ! -f "$BACKEND_DIR/package.json" ]; then
  echo "❌ Run this from the marketai-backend root (where package.json lives)."
  exit 1
fi

SERVER_TS="src/server.ts"

echo "📄 Overwriting $SERVER_TS with clean, known-good implementation..."

cat > "$SERVER_TS" << 'TS'
import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRoutes from "./routes/authRoutes.js";
import systemRoutes from "./routes/system.js";
import healthRoutes from "./routes/health.js";
import brainRoutes from "./routes/brain.js";

// Debug / X-Ray routes
import debugRailway from "./routes/debugRailway.js";
import debugCrash from "./routes/debugCrash.js";

const app = express();

// --------------------------------------
// CORS CONFIG
// --------------------------------------
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://stocks.jeeniemedia.com",
  "https://www.stocks.jeeniemedia.com"
];

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-side / curl / mobile (no origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// Preflight for all routes
app.options("*", cors());

app.use(express.json());
app.use(morgan("dev"));

// --------------------------------------
// API ROUTES (ALL UNDER /api/...)
// --------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/brain", brainRoutes);

// --------------------------------------
// DEBUG / X-RAY ROUTES (NON-API)
// --------------------------------------
app.use("/debug", debugRailway);
app.use("/debug", debugCrash);

// Root status (optional but nice for sanity checks)
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "marketai-backend",
    message: "Root is alive. Use /api/* for main endpoints."
  });
});

// --------------------------------------
// SERVER LISTEN (RAILWAY + LOCAL)
// --------------------------------------
const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT} (0.0.0.0 bound)`);
});

export default app;
TS

echo "✅ Clean server.ts written."

echo "🏗 Rebuilding backend..."
npm run build

echo "==============================================="
echo "  DONE."
echo "  Now run:"
echo "    git add src/server.ts"
echo "    git commit -m 'Regenerate clean server.ts routing'"
echo "    git push"
echo ""
echo "  After Railway deploys, re-run:"
echo "    ./backend_validator.sh"
echo "    NEXT_PUBLIC_API_URL=\"https://marketai-backend-production-b474.up.railway.app\" \\"
echo "      node frontend_test_suite.js"
echo "==============================================="
