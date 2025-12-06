#!/bin/bash

echo "==============================================="
echo "  🚀 Installing Crash Detector Debug Endpoint"
echo "==============================================="

cat > src/routes/debugCrash.ts << 'EOR'
import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

router.get("/crash-scan", (req, res) => {
  const routesDir = path.join(__dirname, "./");

  const results: any[] = [];

  fs.readdirSync(routesDir).forEach(file => {
    if (!file.endsWith(".js")) return;
    const full = path.join(routesDir, file);

    try {
      // Try requiring the route file
      require(full);
      results.push({ file, status: "OK" });
    } catch (err: any) {
      results.push({
        file,
        status: "CRASH",
        error: err.message || String(err)
      });
    }
  });

  res.json({ results });
});

export default router;
EOR

echo "🔧 Patching server.ts to mount crash detector..."

# Add import if missing
if ! grep -q "debugCrash" src/server.ts; then
  sed -i '' '/import .* from .*brainRoutes/ a\
import debugCrash from "./routes/debugCrash.js";
' src/server.ts
fi

# Add route mount
if ! grep -q 'app.use("/debug", debugCrash)' src/server.ts; then
  sed -i '' '/app.use(".*brain"/ a\
app.use("/debug", debugCrash);
' src/server.ts
fi

echo "🏗 Rebuilding..."
npm run build

echo ""
echo "==============================================="
echo "  DONE — NOW DEPLOY AND RUN:"
echo "  curl https://marketai-backend-production-b474.up.railway.app/debug/crash-scan"
echo "==============================================="
