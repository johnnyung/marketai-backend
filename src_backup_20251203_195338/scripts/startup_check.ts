import versionLockService from '../services/versionLockService.js';

async function check() {
    const result = versionLockService.enforce();
    if (!result.valid) {
        console.error("🚨 SYSTEM BOOT HALTED: Architecture Regression Detected.");
        process.exit(1);
    } else {
        console.log("🚀 SYSTEM BOOT AUTHORIZED.");
    }
}
check();
