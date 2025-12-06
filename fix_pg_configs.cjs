// fix_pg_configs.cjs
// Run with: node fix_pg_configs.cjs

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.join(process.cwd(), "src");
const BACKUP_SUFFIX = `.pgfix_backup_${Date.now()}`;

// Regex to match: new Pool({ ... }) or new Client({ ... })
// It grabs everything from the opening { to the } before the closing )
const POOL_OR_CLIENT_REGEX =
  /new\s+(Pool|Client)\s*\(\s*\{[\s\S]*?\}\s*\)/g;

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      // Skip obvious non-source dirs
      if (
        entry === "node_modules" ||
        entry === "dist" ||
        entry === "build" ||
        entry === ".git"
      ) {
        continue;
      }
      walk(full, files);
    } else if (full.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

function fixFile(filePath) {
  let code = fs.readFileSync(filePath, "utf8");

  if (!code.includes("new Pool") && !code.includes("new Client")) {
    return false; // nothing to do
  }

  const original = code;

  code = code.replace(POOL_OR_CLIENT_REGEX, (match, ctorName) => {
    // ctorName is "Pool" or "Client"
    return `new ${ctorName}({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})`;
  });

  if (code !== original) {
    // Write a one-time backup
    const backupPath = filePath + BACKUP_SUFFIX;
    if (!fs.existsSync(backupPath)) {
      fs.writeFileSync(backupPath, original, "utf8");
    }

    fs.writeFileSync(filePath, code, "utf8");
    console.log(`🔧 Fixed PG config in: ${filePath}`);
    return true;
  }

  return false;
}

console.log(`📁 Scanning TS files under: ${ROOT_DIR}`);
const files = walk(ROOT_DIR);
console.log(`🔍 Found ${files.length} .ts files to inspect`);

let changedCount = 0;
for (const file of files) {
  if (fixFile(file)) changedCount++;
}

console.log(`✅ PG config normalization complete. Files modified: ${changedCount}`);
console.log("👉 Backups created with suffix:", BACKUP_SUFFIX);
