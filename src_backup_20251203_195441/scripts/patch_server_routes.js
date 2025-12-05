const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '../server.ts');
let content = fs.readFileSync(serverPath, 'utf8');

// 1. Add Import if missing
if (!content.includes('userPortfolioRoutes')) {
    console.log('   Injecting portfolio route import...');
    content = content.replace(
        "import systemRoutes from './routes/system.js';",
        "import systemRoutes from './routes/system.js';\nimport userPortfolioRoutes from './routes/userPortfolioRoutes.js';"
    );
}

// 2. Add Route Use if missing
if (!content.includes('app.use(\'/api/my-portfolio\'')) {
    console.log('   Injecting portfolio route usage...');
    content = content.replace(
        "app.use('/api/paper-trading', paperTradingRoutes);",
        "app.use('/api/paper-trading', paperTradingRoutes);\napp.use('/api/my-portfolio', userPortfolioRoutes);"
    );
}

fs.writeFileSync(serverPath, content);
console.log('   ✅ server.ts patched successfully.');
