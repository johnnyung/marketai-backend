const fs = require('fs');

const serverPath = 'src/server.ts';
const routesDir = 'src/routes';

console.log('🔧 Reading server.ts...');
let server = fs.readFileSync(serverPath, 'utf8');

console.log('🔧 Scanning route files...');
const files = fs.readdirSync(routesDir)
  .filter(f => f.endsWith('.ts'));

const imports = [];
const uses = [];

for (const file of files) {
  const base = file.replace(/\.ts$/, '');

  // Convert ai-tips → aiTips
  const clean = base.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const varName = clean + 'Routes';

  imports.push(`import ${varName} from './routes/${base}.ts';`);
  uses.push(`app.use('/api/${clean}', ${varName});`);
}

console.log('🔧 Removing old import blocks...');
server = server.replace(/import .* from '\.\/routes\/.*';\n?/g, '');

console.log('🔧 Removing old app.use blocks...');
server = server.replace(/app\.use\(\/api.*\);\n?/g, '');

console.log('🔧 Injecting new imports...');
server = imports.join('\n') + '\n\n' + server;

console.log('🔧 Injecting new app.use() calls...');
server = server.replace(
  /app\.use\(express\.json\(\)\);/,
  `app.use(express.json());\n${uses.join('\n')}\n`
);

console.log('💾 Writing server.ts...');
fs.writeFileSync(serverPath, server);

console.log('\n====================================================');
console.log('  ✅ server.ts ROUTES SUCCESSFULLY REBUILT');
console.log('====================================================\n');
