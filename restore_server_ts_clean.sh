#!/bin/bash
set -e

SERVER="src/server.ts"

echo "====================================="
echo "   🔧 Restoring clean server.ts"
echo "====================================="

cat > $SERVER << 'EOS'
import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRoutes from "./routes/authRoutes.js";
import systemRoutes from "./routes/system.js";
import healthRoutes from "./routes/health.js";
import brainRoutes from "./routes/brain.js";

import debugCrash from "./routes/debugCrash.js";

const app = express();

// ---------------------------
// CORS CONFIG
// ---------------------------
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://stocks.jeeniemedia.com",
  "https://www.stocks.jeeniemedia.com"
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.log("🚫 CORS blocked:", origin);
      return callback(new Error("Not allowed"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json());
app.use(morgan("dev"));

// ---------------------------
// API ROUTES
// ---------------------------
app.use("/api/auth", authRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/brain", brainRoutes);

// ---------------------------
// DEBUG ROUTES
// ---------------------------
app.use("/debug", debugCrash);

// ---------------------------
// ROOT CHECK
// ---------------------------
app.get("/", (_req, res) => {
  res.json({ status: "ok", msg: "backend is running" });
});

// ---------------------------
// LISTEN
// ---------------------------
const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export default app;
EOS

echo "📦 Rebuilding..."
npm run build

echo "====================================="
echo "  ✔ server.ts restored"
echo "  NOW RUN:"
echo "      git add ."
echo "      git commit -m \"Restore stable server.ts\""
echo "      git push"
echo "====================================="
