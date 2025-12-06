#!/usr/bin/env node
import fs from "fs";
import dotenv from "dotenv";

// --------------------------------------
// Load .env automatically if present
// --------------------------------------
if (fs.existsSync(".env")) {
  dotenv.config();
  console.log("📄 Loaded .env automatically");
}

// Allow inline override as well
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  process.env.REACT_APP_API_URL;

if (!API_URL) {
  console.error("❌ ERROR: No API URL found.");
  console.error("Set NEXT_PUBLIC_API_URL in .env or run:");
  console.error(
    'NEXT_PUBLIC_API_URL="https://xxxx.up.railway.app" node frontend_test_suite.js'
  );
  process.exit(1);
}

console.log("==============================================");
console.log("        MARKETAI FRONTEND TEST SUITE          ");
console.log("==============================================");
console.log("🔗 Backend URL:", API_URL);
console.log("\n🚀 Running tests...\n");

// Simple helper
async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (err) {
    console.log(`❌ ${name}`);
    console.log("   →", err.message);
    return false;
  }
}

(async () => {
  const results = {};

  // 1. Health
  results.health = await test("Health endpoint", async () => {
    const res = await fetch(`${API_URL}/api/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  // 2. Register
  const testEmail = `frontend_${Date.now()}@example.com`;
  let token = null;

  results.register = await test("Register", async () => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "test123" }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Unknown error");
  });

  // 3. Login
  results.login = await test("Login", async () => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "test123" }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Unknown error");

    token = data.token;
  });

  // 4. Authenticated /me
  results.auth_me = await test("Auth route (/api/auth/me)", async () => {
    if (!token) throw new Error("No token from login");

    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 404) throw new Error("Route missing (404)");
    if (!res.ok) throw new Error(`Status ${res.status}`);

    const data = await res.json();
    if (!data.user) throw new Error("Missing user in response");
  });

  // 5. SSR-style fetch (just reusing health)
  results.ssr = await test("SSR fetch", async () => {
    const res = await fetch(`${API_URL}/api/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  // 6. CSR-style fetch (same endpoint, different label)
  results.csr = await test("CSR fetch", async () => {
    const res = await fetch(`${API_URL}/api/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  console.log("\n==============================================");
  console.log("                TEST SUMMARY");
  console.log("==============================================");

  let passed = 0;
  for (const [name, ok] of Object.entries(results)) {
    console.log(`${ok ? "✅" : "❌"} ${name}`);
    if (ok) passed++;
  }

  console.log("----------------------------------------------");
  console.log(`RESULT: ${passed}/${Object.keys(results).length} tests passed`);
  console.log("==============================================");
})();
