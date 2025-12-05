#!/bin/bash

echo "============================================================"
echo "   MARKET_AI — VERIFY A7 SAFE WRAPPERS (SYNTAX FIXED)"
echo "============================================================"

# Verify build exists
if [ ! -f "dist/services/diagnosticEnginesRegistry.js" ]; then
  echo "❌ Registry not found at dist/services/diagnosticEnginesRegistry.js"
  echo "   Running build..."
  npm run build
fi

# Run Node verifier (ESM Mode)
# Note: No backslashes before backticks or ${} in this block
node --input-type=module << 'NODE_EOF'
import path from "path";
import fs from "fs";

// Use CWD to anchor the path reliably
const projectRoot = process.cwd();
const registryPath = path.join(projectRoot, "dist/services/diagnosticEnginesRegistry.js");

console.log(`   📍 Loading Registry from: ${registryPath}`);

if (!fs.existsSync(registryPath)) {
    console.error("   ❌ Registry file missing on disk.");
    process.exit(1);
}

try {
    // Dynamic import of the registry
    const registry = await import(registryPath);
    
    // Handle both default export and named export patterns
    const engines = registry.DIAGNOSTIC_ENGINES || registry.default || [];

    if (!Array.isArray(engines) || engines.length === 0) {
         console.log("   ⚠️  Registry is valid but empty (No legacy engines to wrap). Passing.");
         process.exit(0);
    }

    console.log(`   📊 Found ${engines.length} engines in Registry.`);

    let passed = 0;
    for (const engine of engines) {
        process.stdout.write(`   👉 Testing ${engine.id || 'Unknown'}... `);
        try {
            if (typeof engine.evaluate !== 'function') {
                throw new Error("Missing evaluate() method");
            }
            
            // Execute the safe wrapper
            const result = await engine.evaluate("TEST_TICKER", {});
            
            if (result && result.status) {
                console.log("✅ OK");
                passed++;
            } else {
                console.log("❌ INVALID RESULT");
                console.error(result);
            }
        } catch (err) {
            console.log("❌ CRASH");
            console.error(err);
        }
    }

    if (passed === engines.length) {
        console.log("\n   ✅ ALL A7 SAFE WRAPPERS OPERATIONAL.");
        process.exit(0);
    } else {
        console.error("\n   🚨 SOME ENGINES FAILED VERIFICATION.");
        process.exit(1);
    }

} catch (err) {
    console.error("   ❌ Critical Loader Error:", err);
    process.exit(1);
}
NODE_EOF
