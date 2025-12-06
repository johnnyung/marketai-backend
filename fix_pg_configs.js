import fs from "fs";
import path from "path";

const ROOT = "./src";

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) walk(full, files);
    else if (full.endsWith(".ts")) files.push(full);
  }
  return files;
}

function fixFile(file) {
  let code = fs.readFileSync(file, "utf8");

  // Detect Pool or Client initializer
  if (!code.includes("new Pool") && !code.includes("new Client")) return;

  console.log(`🔧 Fixing ${file}`);

  // Replace ANY Pool/Client config with clean version
  code = code.replace(
    /new\s+(Pool|Client)\s*\(\s*\{[\s\S]*?\}\s*\)/g,
    `new $1({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})`
  );

  fs.writeFileSync(file, code, "utf8");
}

const files = walk(ROOT);
console.log(`📁 Scanning ${files.length} TS files...`);

for (const file of files) {
  fixFile(file);
}

console.log("✅ ALL PG CONFIGS CLEANED");
