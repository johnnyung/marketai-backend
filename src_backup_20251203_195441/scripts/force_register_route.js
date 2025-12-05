const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '../server.ts');
let content = fs.readFileSync(serverPath, 'utf8');
let modified = false;

// 1. Check for Import
if (!content.includes('import userPortfolioRoutes')) {
    console.log('   👉 Injecting Import statement...');
    // Find the last import and add ours after it
    const importRegex = /import .* from .*;(\r\n|\n)/g;
    const imports = content.match(importRegex);
    if (imports) {
        const lastImport = imports[imports.length - 1];
        content = content.replace(lastImport, `${lastImport}import userPortfolioRoutes from './routes/userPortfolioRoutes.js';\n`);
        modified = true;
    }
}

// 2. Check for Route Usage
if (!content.includes("app.use('/api/my-portfolio'")) {
    console.log('   👉 Injecting App.use route...');
    
    // Try to find a good anchor point
    const anchor = "app.use('/api/auth', authRoutes);";
    if (content.includes(anchor)) {
        content = content.replace(
            anchor,
            `${anchor}\napp.use('/api/my-portfolio', userPortfolioRoutes);`
        );
        modified = true;
    } else {
        // Fallback anchor
        const fallback = "const app = express();";
        if (content.includes(fallback)) {
             // Find where routes start usually (after middleware) or just append before listen
             // Safest bet: look for other app.use('/api
             const apiRoute = content.match(/app\.use\('\/api\/.*', .*\);/);
             if (apiRoute) {
                 content = content.replace(apiRoute[0], `${apiRoute[0]}\napp.use('/api/my-portfolio', userPortfolioRoutes);`);
                 modified = true;
             }
        }
    }
}

if (modified) {
    fs.writeFileSync(serverPath, content);
    console.log('   ✅ server.ts successfully updated.');
} else {
    console.log('   ℹ️  server.ts already contains the route.');
}
