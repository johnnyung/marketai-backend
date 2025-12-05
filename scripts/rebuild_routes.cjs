#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const ROUTES_DIR = path.join(ROOT, "src/routes");
const SERVER_FILE = path.join(ROOT, "src/server.ts");

// Marker blocks
const IMPORT_START = "// === AUTO-ROUTE-IMPORTS-START ===";
const IMPORT_END   = "// === AUTO-ROUTE-IMPORTS-END ===";
const USE_START    = "// === AUTO-ROUTE-USE-START ===";
const USE_END      = "// === AUTO-ROUTE-USE-END ===";

// Convert filename → camelCase var name
function toVarName(file) {
  const base = file.replace(".ts", "");
  const camel = base.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  return camel + "Routes";
}

// Convert filename → API path (kebab-case)
function toApiPath(file) {
  return file.replace(".ts", "");
}

console.log("🔍 Loading server.ts...");
let server = fs.readFileSync(SERVER_FILE, "utf8");

console.log("🔍 Scanning route folder...");
const files = fs.readdirSync(ROUTES_DIR)
  .filter(f => f.endsWith(".ts"));

console.log(`   Found ${files.length} route files.`);

// Build imports + app.use()
const imports = [];
const uses = [];

for (const file of files) {
  const varName = toVarName(file);
  const routePath = toApiPath(file);

  imports.push(`import ${varName} from './routes/${routePath}';`);
  uses.push(`app.use('/api/${routePath}', ${varName});`);
}

// Helper: replace marker block
function replaceBlock(content, startMarker, endMarker, newBlock) {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker);

  if (start === -1 || end === -1) {
    console.error("❌ Missing markers:", startMarker, endMarker);
    process.exit(1);
  }

  return (
    content.substring(0, start + startMarker.length) +
    "\n" + newBlock + "\n" +
    content.substring(end)
  );
}

// Inject imports
server = replaceBlock(server, IMPORT_START, IMPORT_END, imports.join("\n"));

// Inject route uses
server = replaceBlock(server, USE_START, USE_END, uses.join("\n"));

console.log("💾 Writing updated server.ts...");
fs.writeFileSync(SERVER_FILE, server);

console.log("\n====================================================");
console.log("  ✅ server.ts: Routes rebuilt successfully!");
console.log("====================================================\n");
