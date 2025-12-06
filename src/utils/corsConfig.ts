import cors from "cors";

const allowed = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://stocks.jeeniemedia.com",
  "https://www.stocks.jeeniemedia.com"
];

export default cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (allowed.includes(origin)) return cb(null, true);
    console.log("🚫 BLOCKED ORIGIN:", origin);
    return cb(new Error("CORS blocked: " + origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
});
