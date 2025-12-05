import dotenv from "dotenv";
import path from "path";
import jwt from "jsonwebtoken";

// 1. FORCE LOAD .env.local
// This ensures we use the EXACT same file the server is now configured to use.
const envPath = path.resolve(process.cwd(), ".env.local");
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error("❌ Error loading .env.local:", result.error);
    process.exit(1);
}

console.log(`📂 Loaded environment from: ${envPath}`);

// 2. VALIDATE SECRET
const secret = process.env.JWT_SECRET;
if (!secret) {
    console.error("❌ CRITICAL: JWT_SECRET is missing in .env.local");
    process.exit(1);
}

// Security check log (first 5 chars)
console.log(`🔐 Secret Prefix: ${secret.substring(0, 5)}...`);

// 3. GENERATE TOKEN
const payload = {
    userId: 1,
    id: 1, // Legacy support
    email: 'admin@marketai.com',
    username: 'admin',
    role: 'admin'
};

try {
    const token = jwt.sign(payload, secret, {
        expiresIn: '120d', // Long expiration for dev convenience
        algorithm: 'HS256'
    });

    console.log("\n✅ VALID TOKEN GENERATED:");
    console.log("---------------------------------------------------");
    console.log(`Bearer ${token}`);
    console.log("---------------------------------------------------");
} catch (e: any) {
    console.error("❌ Token signing failed:", e.message);
}
