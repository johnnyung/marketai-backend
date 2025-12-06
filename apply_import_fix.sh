#!/bin/bash
set -e

echo "============================================"
echo "     MARKETAI — OPTION A ROUTE FIX"
echo "   (Importing compiled JS from /dist)"
echo "============================================"

BACKEND="$HOME/Desktop/marketai-backend"

if [ ! -d "$BACKEND" ]; then
  echo "❌ Backend not found at $BACKEND"
  exit 1
fi

cd "$BACKEND"

echo "🔧 Updating tsconfig.json (setting outDir=dist)..."

cat > tsconfig.json << 'EOT'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "node",
    "rootDir": "src",
    "outDir": "dist",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": false,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
EOT

echo "🔧 Rewriting server.ts to import compiled JS..."

cat > src/server.ts << 'EOS'
import express from "express";
import cors from "cors";
import morgan from "morgan";

// All route imports will be rewritten at build time.
// Runtime (Railway) loads from dist/server.js → dist/routes/*.js

import authRoutes from "./routes/authRoutes.js";
import systemRoutes from "./routes/system.js";
import healthRoutes from "./routes/health.js";
import brainRoutes from "./routes/brain.js";

const app = express();

// CORS config
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://stocks.jeeniemedia.com",
  "https://www.stocks.jeeniemedia.com"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS blocked for origin: " + origin), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.options("*", cors());
app.use(express.json());
app.use(morgan("dev"));

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/brain", brainRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

export default app;
EOS

echo "🔧 Cleaning old dist folder..."
rm -rf dist

echo "🔧 Rebuilding backend..."
npm run build

echo ""
echo "============================================"
echo "   ✔ FIX COMPLETE"
echo "   NEXT STEPS:"
echo "   1. git add ."
echo "   2. git commit -m 'Fix import system, Option A'"
echo "   3. git push"
echo "   4. Railway will auto-deploy"
echo "============================================"
