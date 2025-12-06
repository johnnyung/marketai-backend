import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import systemRoutes from "./routes/system.js";
import healthRoutes from "./routes/health.js";


const app = express();

// ---------------------------------------
// ✅ CORS CONFIG (FULLY PRODUCTION SAFE)
// ---------------------------------------
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
      return callback(new Error("❌ CORS blocked for origin: " + origin), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// Preflight
app.options("*", cors());

app.use(express.json());
app.use(morgan("dev"));

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/health", healthRoutes);


const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export default app;
