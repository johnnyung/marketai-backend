#!/bin/bash
set -e

echo "Fixing package.json start script..."

jq '.scripts.start="node dist/server.js"' package.json > package.tmp.json
mv package.tmp.json package.json

echo "Rebuilding..."
npm run build

echo "DONE. NOW git add + commit:"
echo "  git add package.json dist"
echo "  git commit -m 'Force Railway to run dist/server.js'"
echo "  git push"
