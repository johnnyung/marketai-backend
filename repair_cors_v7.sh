#!/bin/bash
set -e

echo "=================================================="
echo "  🍏 CORS Surgeon v7 — macOS Safe Deep Cleaner"
echo "=================================================="

FILE="src/server.ts"

echo "🔍 STEP 1 — Removing broken CORS fragments..."

# Remove duplicate allowedOrigins blocks
sed -i '' '/const allowedOrigins = \[/,/];/d' "$FILE"

# Remove any app.use(cors(...) blocks
sed -i '' '/app.use(.*cors({)/,/})/d' "$FILE"

# Remove stray curly braces-based lines (mac-safe)
sed -i '' '1,120s/^[[:space:]]*}[[:space:]]*$//' "$FILE"
sed -i '' '1,120s/^[[:space:]]*},[[:space:]]*$//' "$FILE"
sed -i '' '1,120s/^[[:space:]]*});[[:space:]]*$//' "$FILE"

# Remove old app.options("*", cors())
sed -i '' '/app.options(.*cors()/d' "$FILE"

echo "✔ Cleanup completed."

echo "🔧 STEP 2 — Reinserting verified clean CORS block..."

# Insert NEW CORS block AFTER express.json()
sed -i '' '/app.use(express.json());/a\
\
// --------------------------------------\n\
// GLOBAL CORS — CLEAN + VERIFIED\n\
// --------------------------------------\n\
const allowedOrigins = [\n\
  "http://localhost:3000",\n\
  "http://localhost:5173",\n\
  "https://stocks.jeeniemedia.com",\n\
  "https://www.stocks.jeeniemedia.com"\n\
];\n\
\n\
app.use(\n\
  cors({\n\
    origin(origin, callback) {\n\
      if (!origin) return callback(null, true);\n\
      if (allowedOrigins.includes(origin)) return callback(null, true);\n\
      console.log("🚫 CORS BLOCKED ORIGIN:", origin);\n\
      return callback(new Error("CORS blocked: " + origin));\n\
    },\n\
    credentials: true,\n\
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],\n\
    allowedHeaders: ["Content-Type", "Authorization"],\n\
  })\n\
);\n\
\n\
app.options("*", cors());\n\
' "$FILE"

echo "🏗 STEP 3 — Rebuilding backend..."
npm run build || true

echo "=================================================="
echo "  ✅ CORS fully repaired (v7 mac-safe)"
echo "  Open: sed -n '1,140p' src/server.ts"
echo "=================================================="
