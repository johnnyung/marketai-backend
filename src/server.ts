import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRoutes from "./routes/authRoutes.js";
import systemRoutes from "./routes/system.js";
import healthRoutes from "./routes/health.js";
import brainRoutes from "./routes/brain.js";

import debugRailway from "./routes/debugRailway.js";
import debugCrash from "./routes/debugCrash.js";

const app = express();

/* ----------------------------------------------------
   GLOBAL MIDDLEWARE
----------------------------------------------------- */

app.use(express.json());
app.use(morgan("dev"));

/* ----------------------------------------------------
   CLEAN CORS CONFIG (ONLY ONE)
----------------------------------------------------- */

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

      console.log("🚫 BLOCKED ORIGIN:", origin);
      return callback(new Error("CORS blocked: " + origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.options("*", cors());

/* ----------------------------------------------------
   API ROUTES
----------------------------------------------------- */
app.use("/api/auth", authRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/brain", brainRoutes);

/* ----------------------------------------------------
   DEBUG ROUTES
----------------------------------------------------- */
app.use("/debug", debugRailway);
app.use("/debug", debugCrash);

/* ----------------------------------------------------
   ROOT CHECK
----------------------------------------------------- */

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "marketai-backend",
    message: "Root is alive. Use /api/* for endpoints."
  });
});

/* ----------------------------------------------------
   SERVER LISTEN
----------------------------------------------------- */
const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT} (bound to 0.0.0.0)`);
});

export default app;
