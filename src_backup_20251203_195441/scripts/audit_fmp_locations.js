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
            // Scan only TS and JS files
            if (file.endsWith('.ts') || file.endsWith('.js')) {
                // Exclude this audit script itself to keep output clean
                if (file === 'audit_fmp_locations.js') return;

                const content = fs.readFileSync(filePath, 'utf-8');
                const lines = content.split('\n');
                
                lines.forEach((line, index) => {
                    const lowerLine = line.toLowerCase();
                    // Check if any keyword exists in the line
                    const hasMatch = KEYWORDS.some(k => lowerLine.includes(k.toLowerCase()));
                    
                    if (hasMatch) {
                        results.push({
                            file: filePath.replace(process.cwd() + '/', ''),
                            line: index + 1,
                            code: line.trim()
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
