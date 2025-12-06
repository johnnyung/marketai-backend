#!/bin/bash
set -e

echo "==============================================="
echo "  🔧 Fixing debugCrash ESM (__dirname error)"
echo "==============================================="

FILE="src/routes/debugCrash.ts"

if [ ! -f "$FILE" ]; then
  echo "❌ $FILE not found!"
  exit 1
fi

echo "📄 Patching $FILE ..."

cat > "$FILE" << 'EOS'
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.get("/crash-scan", async (req, res) => {
  try {
    const crashPath = path.join(__dirname, "../../dist/routes");
    const files = fs.readdirSync(crashPath);

    res.json({
      ok: true,
      routeFiles: files,
      cwd: process.cwd(),
      dirname: __dirname
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

export default router;
EOS

echo "🏗 Rebuilding..."
npm run build

echo "==============================================="
echo "  ✅ FIX APPLIED — NOW run:"
echo "  git add . && git commit -m \"Fix debugCrash ESM\" && git push"
echo ""
echo "After deploy:"
echo "  curl https://marketai-backend-production-b474.up.railway.app/debug/crash-scan"
echo "==============================================="
