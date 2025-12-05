#!/bin/bash
echo "🔍 STATIC CODE SCAN: Searching for Mock Artifacts (Strict Mode)..."
echo "==================================================="

FAILures=0

# Helper function
scan() {
    pattern="$1"
    echo "--- Checking for '$pattern' ---"
    # Scan typescript files, excluding node_modules, dist, and this script
    matches=$(grep -r "$pattern" src --exclude-dir=scripts --include=*.ts 2>/dev/null | grep -v "static_audit" | grep -v "purity_probe")
    if [ ! -z "$matches" ]; then
        echo "⚠️  Found potential issue:"
        echo "$matches" | head -n 3
        ((FAILures++))
    fi
}

scan "score: 50"
scan "50.0"
scan "\"50\""
scan "Math.random"
scan "default"
scan "neutral"
scan "placeholder"
scan "mock"
scan "vix_level: 20"
scan "moderate"
scan "sticky"
scan "volatile"

echo "==================================================="
if [ $FAILures -eq 0 ]; then
    echo "✅ STATIC AUDIT PASSED."
else
    echo "⚠️  WARNING: Found potential static artifacts. Verify they are not fake data."
fi
