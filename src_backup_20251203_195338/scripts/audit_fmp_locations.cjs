const fs = require('fs');
const path = require('path');

const KEYWORDS = [
    "financialmodelingprep",
    "fmp",
    "quote",
    "profile",
    "ratios",
    "metrics",
    "options",
    "economic",
    "institutional",
    "insider",
    "historical",
    "v3",
    "v4",
    "api/latest",
    "stable"
];

const results = [];

function walk(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
                walk(filePath);
            }
        } else {
            // Scan only TS and JS/CJS files
            if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.cjs')) {
                // Exclude this audit script itself
                if (file.includes('audit_fmp_locations')) return;

                const content = fs.readFileSync(filePath, 'utf-8');
                const lines = content.split('\n');
                
                lines.forEach((line, index) => {
                    const lowerLine = line.toLowerCase();
                    const hasMatch = KEYWORDS.some(k => lowerLine.includes(k.toLowerCase()));
                    
                    if (hasMatch) {
                        results.push({
                            file: filePath.replace(process.cwd() + '/', ''),
                            line: index + 1,
                            code: line.trim().substring(0, 100) // Limit length for readability
                        });
                    }
                });
            }
        }
    });
}

try {
    walk(path.join(process.cwd(), 'src'));
    console.log(JSON.stringify(results, null, 2));
} catch (e) {
    console.error("Scan failed:", e);
    process.exit(1);
}
