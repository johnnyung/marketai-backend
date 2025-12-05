import fs from 'fs';
import path from 'path';

// --- CONFIG ---
const SERVER_PATH = path.join(process.cwd(), 'src', 'server.ts');
const ROUTES_DIR = path.join(process.cwd(), 'src', 'routes');

// --- REGEX ---
// Matches: import authRoutes from './routes/auth.js';
const IMPORT_REGEX = /import\s+(\w+)\s+from\s+['"]\.\/routes\/([\w-]+)(\.js)?['"]/g;
// Matches: app.use('/api/auth', authRoutes);
const MOUNT_REGEX = /app\.use\(['"]([^'"]+)['"],\s*(\w+)\)/g;
// Matches: router.get(..., router.post(..., etc. inside the file
const CONTROLLER_REGEX = /router\.(get|post|put|delete|patch)\(/g;

async function audit() {
    console.log("🛡️  STARTING ROUTE REGISTRY AUDIT...");
    console.log("-----------------------------------------------------------------------------------------");
    console.log(
        "%-30s | %-10s | %-25s | %-20s | %-10s",
        "FILE", "EXISTS", "MOUNT PATH", "VARIABLE", "STATUS"
    );
    console.log("-----------------------------------------------------------------------------------------");

    // 1. READ SERVER.TS
    if (!fs.existsSync(SERVER_PATH)) {
        console.error("❌ CRITICAL: server.ts not found!");
        process.exit(1);
    }
    const serverCode = fs.readFileSync(SERVER_PATH, 'utf-8');

    // 2. EXTRACT IMPORTS
    const imports = new Map<string, string>(); // Variable -> Filename
    const fileToVar = new Map<string, string>(); // Filename -> Variable
    
    for (const match of serverCode.matchAll(IMPORT_REGEX)) {
        const variable = match[1];
        const filename = match[2] + '.ts'; // Assume .ts source
        imports.set(variable, filename);
        fileToVar.set(filename, variable);
    }

    // 3. EXTRACT MOUNTS
    const mounts = new Map<string, string>(); // Variable -> Path
    for (const match of serverCode.matchAll(MOUNT_REGEX)) {
        const urlPath = match[1];
        const variable = match[2];
        mounts.set(variable, urlPath);
    }

    // 4. SCAN FILESYSTEM
    const physicalFiles = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.ts'));

    const allFiles = new Set([...physicalFiles, ...imports.values()]);

    let missingCount = 0;
    let unwiredCount = 0;
    let brokenCount = 0;

    // 5. AUDIT LOOP
    const results = Array.from(allFiles).sort().map(file => {
        const exists = fs.existsSync(path.join(ROUTES_DIR, file));
        const variable = fileToVar.get(file) || '---';
        const mountPath = mounts.get(variable) || '---';
        
        let status = '✅ OK';
        let reason = '';

        // CHECKS
        if (!exists) {
            status = '❌ MISSING';
            missingCount++;
        } else if (variable === '---') {
            status = '⚠️  UNUSED';
            reason = '(Not imported)';
            unwiredCount++;
        } else if (mountPath === '---') {
            status = '⚠️  UNMOUNTED';
            reason = '(Imported but not app.use)';
            unwiredCount++;
        } else {
            // Deep Check: Does the file actually export a router?
            const content = fs.readFileSync(path.join(ROUTES_DIR, file), 'utf-8');
            if (!content.includes('export default router') && !content.includes('export default')) {
                 status = '❌ NO EXPORT';
                 brokenCount++;
            } else if (!content.match(CONTROLLER_REGEX)) {
                 status = '⚠️  EMPTY'; // No routes defined
                 reason = '(No endpoints)';
            }
        }

        return {
            file,
            exists: exists ? 'YES' : 'NO',
            path: mountPath,
            variable,
            status,
            reason
        };
    });

    // 6. PRINT RESULTS
    for (const r of results) {
        console.log(
            "%-30s | %-10s | %-25s | %-20s | %s %s",
            r.file, r.exists, r.path, r.variable, r.status, r.reason
        );
    }

    console.log("-----------------------------------------------------------------------------------------");
    console.log(`📊 SUMMARY:`);
    console.log(`   - Total Routes Found: ${results.length}`);
    console.log(`   - Missing Files:      ${missingCount}`);
    console.log(`   - Unwired/Unused:     ${unwiredCount}`);
    console.log(`   - Broken Exports:     ${brokenCount}`);

    // 7. SHADOWING CHECK
    // Check if a wildcard route appears before specific routes in server.ts logic
    // (Simplified string index check)
    const catchAllIndex = serverCode.indexOf("app.use('*'");
    if (catchAllIndex !== -1) {
        const lastMountIndex = serverCode.lastIndexOf("app.use('/api");
        if (catchAllIndex < lastMountIndex) {
             console.error("\n🚨 CRITICAL: 404 Wildcard shadows API routes! Move 404 handler to bottom of server.ts");
             brokenCount++;
        }
    }

    if (missingCount > 0 || brokenCount > 0) {
        console.log("\n❌ AUDIT FAILED: Integrity issues detected.");
        process.exit(1);
    } else {
        console.log("\n✅ ROUTE REGISTRY VALID. All systems connected.");
        process.exit(0);
    }
}

audit();
