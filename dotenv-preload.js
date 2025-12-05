import dotenv from "dotenv";

const ENV_PATH = "/Users/animationtech/Desktop/marketai-backend/.env";

console.log("🔧 [PRELOAD] Loading .env from:", ENV_PATH);
const result = dotenv.config({ path: ENV_PATH });

if (result.error) {
  console.error("❌ [PRELOAD] Failed to load .env:", result.error);
} else {
  if (process.env.DATABASE_URL) {
    console.log("✅ [PRELOAD] DATABASE_URL LOADED");
    console.log("🔍 DB URL IN USE:", process.env.DATABASE_URL);
  } else {
    console.error("❌ [PRELOAD] DATABASE_URL is missing in .env");
  }
}
