#!/bin/bash
set -e

echo "==============================================="
echo "   🚀 Installing Railway Debug Pack (Auto)"
echo "==============================================="

BACKEND_DIR="$(pwd)"

# -------------------------------------------------
# 1. Create debugRailway.ts
# -------------------------------------------------
echo "📄 Writing src/routes/debugRailway.ts ..."
mkdir -p src/routes

cat > src/routes/debugRailway.ts << 'EOS'
import express from "express";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const router = express.Router();

router.get("/commit", (_req, res) => {
  try {
    const hash = execSync("git rev-parse HEAD").toString().trim();
    res.json({ commit: hash });
  } catch (err) {
    res.json({ commit: "UNKNOWN", error: String(err) });
  }
});

router.get("/entrypoint", (_req, res) => {
  res.json({
    entrypoint: process.argv[1],
    cwd: process.cwd(),
    execPath: process.execPath
  });
});

router.get("/routes", (req, res) => {
  const app = req.app;
  const routes: any[] = [];

  app._router.stack.forEach((layer: any) => {
    if (layer.route) {
      routes.push({
        path: layer.route.path,
        methods: layer.route.methods
      });
    }
  });

  res.json({ routes });
});

router.get("/ls", (_req, res) => {
  try {
    const root = process.cwd();
    const entries = fs.readdirSync(root);
    res.json({ root, entries });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/file/*", (req, res) => {
  try {
    const relative = req.params[0];
    const absPath = path.join(process.cwd(), relative);

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: "File not found", path: absPath });
    }

    const content = fs.readFileSync(absPath, "utf8");
    res.type("text/plain").send(content);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
EOS

echo "✅ debugRailway.ts created"


# -------------------------------------------------
# 2. Patch server.ts (import + mount)
# -------------------------------------------------
echo "🔧 Patching src/server.ts ..."

SERVER_FILE="src/server.ts"

# Ensure import exists
if ! grep -q 'import debugRailway' "$SERVER_FILE"; then
  echo "➕ Adding import..."
  sed -i '' '/import .*healthRoutes/d' "$SERVER_FILE" # remove duplicates
  sed -i '' '/import .*brainRoutes/d' "$SERVER_FILE"

  # Add imports cleanly after last import line
  awk '
    /^import/ { last_import = NR }
    { lines[NR] = $0 }
    END {
      for (i=1;i<=NR;i++) {
        print lines[i]
        if (i==last_import) {
          print "import debugRailway from \"./routes/debugRailway.js\";"
        }
      }
    }
  ' "$SERVER_FILE" > "$SERVER_FILE.tmp" && mv "$SERVER_FILE.tmp" "$SERVER_FILE"
fi

# Ensure route mount exists
if ! grep -q 'app.use("/debug"' "$SERVER_FILE"; then
  echo "➕ Adding app.use('/debug', ...) ..."
  sed -i '' '/app.use(.*healthRoutes/a\
app.use("/debug", debugRailway);\
' "$SERVER_FILE"
fi

echo "✅ server.ts patched"


# -------------------------------------------------
# 3. Rebuild
# -------------------------------------------------
echo "🏗 Rebuilding..."
npm run build

echo "==============================================="
echo "   🎉 Railway Debug Pack Installed"
echo "   NEXT:"
echo "     git add ."
echo "     git commit -m 'Install Railway Debug Pack'"
echo "     git push"
echo "==============================================="

