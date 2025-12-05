const fs = require('fs');
const path = require('path');

const BAD = ['/api/v3', '/v3/', 'financialmodelingprep.com/api/', '/v4/'];

function scan(dir) {
  let fails = 0;
  if (!fs.existsSync(dir)) return 0;

  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (!['node_modules','dist','.git'].includes(item)) {
        fails += scan(full);
      }
    } else if (full.endsWith('.ts') || full.endsWith('.js')) {
      // Skip this file
      if (full.endsWith('check_no_v3_usage.js')) continue;

      const content = fs.readFileSync(full,'utf8');
      BAD.forEach(bad => {
        if (content.includes(bad)) {
          fails++;
          console.error("❌ Forbidden legacy FMP pattern:", bad, "in", full);
        }
      });
    }
  }
  return fails;
}

const c = scan(path.resolve(__dirname, '../../src'));
if (c > 0) process.exit(1);
console.log("✅ No legacy FMP endpoints detected.");
