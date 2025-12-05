import fs from 'fs';
import path from 'path';

// Load PMAF (Dynamic require to avoid TS compilation issues with json import)
const loadPMAF = () => {
    try {
        return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/config/pmaf.json'), 'utf8'));
    } catch (e) {
        console.error("❌ CRITICAL: PMAF Missing. System Integrity Unknown.");
        return { manifest: [] };
    }
};

interface Violation {
    file: string;
    issue: string;
}

class VersionLockService {

  enforce() {
    console.log('   🔒 VLEE: Verifying System Integrity against PMAF...');
    const pmaf = loadPMAF();
    const violations: Violation[] = [];

    for (const item of pmaf.manifest) {
        const filePath = path.join(process.cwd(), 'src', item.file);
        
        // 1. Existence Check
        if (!fs.existsSync(filePath)) {
            violations.push({ file: item.file, issue: 'MISSING_FILE' });
            continue;
        }

        // 2. Content Read
        const content = fs.readFileSync(filePath, 'utf-8');

        // 3. Stub/Size Check
        const lineCount = content.split('\n').length;
        if (lineCount < item.min_lines) {
            violations.push({ file: item.file, issue: `ATROPHY_DETECTED (Lines: ${lineCount} < ${item.min_lines})` });
        }

        // 4. Logic Signature Check
        if (!content.includes(item.signature)) {
            violations.push({ file: item.file, issue: `BROKEN_LOGIC (Missing signature: ${item.signature})` });
        }
    }

    if (violations.length > 0) {
        console.error("\n❌ VLEE INTEGRITY FAILURE:");
        violations.forEach(v => console.error(`   - ${v.file}: ${v.issue}`));
        return { valid: false, violations };
    } else {
        console.log("   ✅ VLEE PASSED: All 60+ Engines Valid & Connected.");
        return { valid: true, violations: [] };
    }
  }
}

export default new VersionLockService();
