#!/bin/bash

echo "============================================================"
echo "   MARKET_AI — VERIFY A9 SOURCE AUTOWIRE (SAFE MODE)"
echo "============================================================"

# Ensure build exists
if [ ! -f "dist/services/sourceIngestionRegistry.js" ]; then
  echo "⚠️  dist/services/sourceIngestionRegistry.js not found. Running build..."
  npm run build >/dev/null 2>&1
fi

node --input-type=module << 'NODE_EOF'
import fs from "fs";
import path from "path";

const projectRoot = process.cwd();
const registryPath = path.join(projectRoot, "dist/services/sourceIngestionRegistry.js");

console.log(`📍 Loading A9 registry from: ${registryPath}`);

if (!fs.existsSync(registryPath)) {
  console.error("❌ A9 registry JS not found. Did the build fail?");
  process.exit(1);
}

const registry = await import(registryPath);
const pipelines = registry.A9_SOURCE_PIPELINES || registry.default || [];

if (!Array.isArray(pipelines) || pipelines.length === 0) {
  console.warn("⚠️  A9 registry is empty. Nothing to verify, but this may indicate mis-detection.");
  process.exit(0);
}

console.log(`📊 Pipelines in registry: ${pipelines.length}`);

let missingCount = 0;

for (const p of pipelines) {
  console.log(`\n🔎 Pipeline: ${p.id} (${p.status})`);

  if (p.collectorFile) {
    const fp = path.join(projectRoot, p.collectorFile);
    if (!fs.existsSync(fp)) {
      console.error(`   ❌ Collector missing on disk: ${fp}`);
      missingCount++;
    } else {
      console.log(`   ✅ Collector OK: ${p.collectorFile}`);
    }
  } else {
    console.log("   ℹ️  No collectorFile recorded.");
  }

  if (p.serviceFile) {
    const fp = path.join(projectRoot, p.serviceFile);
    if (!fs.existsSync(fp)) {
      console.error(`   ❌ Service missing on disk: ${fp}`);
      missingCount++;
    } else {
      console.log(`   ✅ Service OK: ${p.serviceFile}`);
    }
  } else {
    console.log("   ℹ️  No serviceFile recorded.");
  }

  if (p.engineFile) {
    const fp = path.join(projectRoot, p.engineFile);
    if (!fs.existsSync(fp)) {
      console.error(`   ❌ Engine missing on disk: ${fp}`);
      missingCount++;
    } else {
      console.log(`   ✅ Engine OK: ${p.engineFile}`);
    }
  } else {
    console.log("   ℹ️  No engineFile recorded.");
  }
}

if (missingCount > 0) {
  console.error(`\n🚨 A9 verification found ${missingCount} missing legs. Registry is valid but some paths are stale.`);
  process.exit(1);
}

console.log("\n✅ A9 registry validated — all recorded file paths exist.");
NODE_EOF
