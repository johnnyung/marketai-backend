// ============================================================
// ABSOLUTE-PATH DOTENV LOADER (Guaranteed to Work on macOS)
// ============================================================

import path from "path";
import dotenv from "dotenv";

// 🔥 Force-load .env from absolute location
const envPath = path.resolve("/Users/animationtech/Desktop/marketai-backend/.env");

console.log("🔧 Loading dotenv from:", envPath);

dotenv.config({ path: envPath });

// Debug check:
if (!process.env.DATABASE_URL) {
  console.error("❌ Dotenv did NOT load DATABASE_URL");
} else {
  console.log("✅ Dotenv loaded DATABASE_URL");
}

// AFTER env is loaded, start server
import "./server.js";
