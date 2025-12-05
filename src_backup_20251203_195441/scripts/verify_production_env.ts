// Run this on Railway via "node dist/scripts/verify_production_env.js"
// It checks if variables are actually injected.

const requiredKeys = ['JWT_SECRET', 'FMP_API_KEY'];

console.log('\n🔍 PRODUCTION ENVIRONMENT AUDIT');
console.log('================================');

let missing = 0;

requiredKeys.forEach(key => {
    if (!process.env[key]) {
        console.error(`❌ CRITICAL: ${key} is MISSING.`);
        missing++;
    } else {
        const val = process.env[key] || '';
        console.log(`✅ ${key} is set (${val.substring(0, 4)}...)`);
    }
});

if (!process.env.PORT) {
    console.warn('⚠️  PORT is not set (Defaulting to 8080)');
} else {
    console.log(`✅ PORT is set to ${process.env.PORT}`);
}

console.log('================================');

if (missing > 0) {
    console.error(`🛑 AUDIT FAILED. ${missing} keys missing.`);
    process.exit(1);
} else {
    console.log('✅ AUDIT PASSED. Environment ready for launch.');
    process.exit(0);
}
