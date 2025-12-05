const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');

function walk(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist'].includes(e.name)) continue;
      walk(full, cb);
    } else if (e.isFile()) {
      cb(full);
    }
  }
}

function needsJsExtension(spec) {
  if (!spec.startsWith('./') && !spec.startsWith('../')) return false;
  if (/\.[a-zA-Z0-9]+$/.test(spec)) return false;
  return true;
}

function patchFile(file) {
  if (!file.endsWith('.ts') && !file.endsWith('.js')) return false;
  if (file.endsWith('.d.ts')) return false;

  let code = fs.readFileSync(file, 'utf8');
  const original = code;
  let changed = false;

  const staticImport = /(import\s+[^'"]+from\s+)(['"])(\.{1,2}\/[^'"]+?)(\2)/g;
  code = code.replace(staticImport, (m, b, q, s, aq) =>
    needsJsExtension(s) ? (changed = true, `${b}${q}${s}.js${q}`) : m
  );

  const sideImport = /(import\s+)(['"])(\.{1,2}\/[^'"]+?)(\2\s*;)/g;
  code = code.replace(sideImport, (m, b, q, s, tail) =>
    needsJsExtension(s) ? (changed = true, `${b}${q}${s}.js${q}${tail}`) : m
  );

  const dynImport = /(import\(\s*)(['"])(\.{1,2}\/[^'"]+?)(\2\s*\))/g;
  code = code.replace(dynImport, (m, b, q, s, t) =>
    needsJsExtension(s) ? (changed = true, `${b}${q}${s}.js${q}${t}`) : m
  );

  const requireCall = /(require\(\s*)(['"])(\.{1,2}\/[^'"]+?)(\2\s*\))/g;
  code = code.replace(requireCall, (m, b, q, s, t) =>
    needsJsExtension(s) ? (changed = true, `${b}${q}${s}.js${q}${t}`) : m
  );

  if (changed && code !== original) {
    fs.writeFileSync(file, code, 'utf8');
    console.log("✔ Patched:", file.replace(ROOT + "/", ""));
    return true;
  }

  return false;
}

console.log("Scanning:", SRC_DIR);
let total = 0, modified = 0;

walk(SRC_DIR, (file) => {
  total++;
  if (patchFile(file)) modified++;
});

console.log("-----------------------------------------------------");
console.log("Processed:", total);
console.log("Modified: ", modified);
console.log("-----------------------------------------------------");
