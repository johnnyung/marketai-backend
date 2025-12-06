#!/bin/bash
set -e

echo "====================================================="
echo "  🚀 Upgrading Crash Scanner → Full Backend X-Ray"
echo "====================================================="

FILE="src/routes/debugCrash.ts"

mkdir -p src/routes

echo "📄 Writing upgraded debugCrash.ts ..."

cat > "$FILE" << 'EOS'
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ESM dirname support
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * 🩻 /debug/crash-scan
 * Performs complete backend introspection:
 *  1. Lists compiled route files in dist/routes/
 *  2. Lists mounted Express routes & order
 *  3. Tests dynamic import of every route file (isolated)
 *  4. Detects missing imports or routes not mounted
 *  5. Displays server entrypoint + cwd
 */
router.get("/crash-scan", async (req, res) => {
  try {
    const distRoutesDir = path.join(process.cwd(), "dist/routes");

    // 1️⃣ List files that exist on the server
    let files = [];
    try {
      files = fs.readdirSync(distRoutesDir);
    } catch (err) {
      files = [`❌ ERROR reading dist/routes → ${err.message}`];
    }

    // 2️⃣ List Express mounted routes with their method map
    const app = req.app;

    const mounted = [];
    app._router.stack.forEach((layer) => {
      if (layer.route && layer.route.path) {
        mounted.push({
          path: layer.route.path,
          methods: layer.route.methods,
        });
      }
      if (layer.name === "router" && layer.handle.stack) {
        layer.handle.stack.forEach((sub) => {
          if (sub.route && sub.route.path) {
            mounted.push({
              path: sub.route.path,
              methods: sub.route.methods,
            });
          }
        });
      }
    });

    // 3️⃣ Test dynamic import of each route file (isolated)
    const importScan = [];
    for (const f of files) {
      if (!f.endsWith(".js")) continue;

      const full = "file://" + path.join(distRoutesDir, f);
      try {
        const mod = await import(full);
        importScan.push({
          file: f,
          defaultExport: !!mod.default,
          ok: true,
        });
      } catch (err) {
        importScan.push({
          file: f,
          ok: false,
          error: err.message,
        });
      }
    }

    // 4️⃣ Identify missing imports relative to mounted routes
    const missingMounted = mounted.filter(
      (m) => !files.some((f) => f.includes(m.path.replace("/api/", "")))
    );

    res.json({
      status: "ok",
      cwd: process.cwd(),
      dirname: __dirname,
      entrypoint: process.argv[1],
      routeFiles: files,
      mountedRoutes: mounted,
      importScan,
      missingMountedRoutes: missingMounted,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
      stack: err.stack,
    });
  }
});

export default router;
EOS

echo "🔧 Patching server.ts to mount /debug/crash-scan ..."
# Remove any prior broken inserts
sed -i '' '/debugCrash/d' src/server.ts

# Add clean import
sed -i '' '1 a\
import debugCrash from "./routes/debugCrash.js";
' src/server.ts

# Add clean mount AFTER api routes
sed -i '' '/app.use(.*api\/health.*)/a\
app.use("/debug", debugCrash);
' src/server.ts

echo "🏗 Rebuilding..."
npm run build

echo "====================================================="
echo "  ✅ Debug X-Ray Installed"
echo ""
echo "  Now run after deploying to Railway:"
echo "  curl https://marketai-backend-production-b474.up.railway.app/debug/crash-scan"
echo "====================================================="
