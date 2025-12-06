#!/bin/bash
set -e

echo "==============================================="
echo "   🔧 Repairing src/server.ts (Full Restore)"
echo "==============================================="

cat > src/server.ts << 'EOS'
import express from "express";
import cors from "cors";
import morgan from "morgan";

/* === Core API Routes === */
import authRoutes from "./routes/authRoutes.js";
import systemRoutes from "./routes/system.js";
import healthRoutes from "./routes/health.js";
import brainRoutes from "./routes/brain.js";

/* === Debug Pack === */
import debugRailway from "./routes/debugRailway.js";

const app = express();

/* === CORS Configuration === */
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://stocks.jeeniemedia.com",
  "https://www.stocks.jeeniemedia.com"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // SSR or curl
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

/* === Mount Routes === */
app.use("/api/auth", authRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/brain", brainRoutes);

/* === Debug Route === */
app.use("/debug", debugRailway);

/* === Server Start === */
const PORT: number = Number(process.env.PORT) || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT} (0.0.0.0 bound)`);
});

export default app;
EOS

echo "✅ server.ts fully restored"

echo "🏗 Rebuilding..."
npm run build

echo "==============================================="
echo " DONE — Commit & Push:"
echo "   git add ."
echo "   git commit -m 'Restore clean server.ts'"
echo "   git push"
echo "==============================================="
