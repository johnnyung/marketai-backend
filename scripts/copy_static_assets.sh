#!/bin/bash
set -e

SRC_DIR="src/data"
DIST_DIR="dist/data"

echo "📁 Copying static data assets..."

if [ -d "$SRC_DIR" ]; then
    mkdir -p "$DIST_DIR"
    
    # Copy top level JSONs
    cp "$SRC_DIR"/*.json "$DIST_DIR"/ 2>/dev/null || true
    
    # Copy Cache Directory recursively
    if [ -d "$SRC_DIR/cache" ]; then
        mkdir -p "$DIST_DIR/cache"
        cp -R "$SRC_DIR/cache"/* "$DIST_DIR/cache"/
    fi
    
    echo "✅ Static assets copied to dist/data"
else
    echo "⚠️  Source directory src/data does not exist. Skipping copy."
fi
