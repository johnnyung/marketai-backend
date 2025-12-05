// Usage: node scripts/update_vercel_env.mjs <TOKEN>
const token = process.argv[2];

if (!token) {
    console.error('❌ Usage: node scripts/update_vercel_env.mjs <BEARER_TOKEN>');
    process.exit(1);
}

// Clean Bearer prefix if pasted
const cleanToken = token.replace('Bearer ', '');
const apiUrl = 'https://marketai-backend-production-397e.up.railway.app'; // Hardcoded prod URL

console.log('\n🌐 VERCEL CONFIGURATION INSTRUCTIONS');
console.log('====================================');
console.log('Go to Vercel Dashboard > Settings > Environment Variables');
console.log('Add/Update the following keys:\n');

console.log(`NEXT_PUBLIC_API_URL   = ${apiUrl}`);
console.log(`NEXT_PUBLIC_API_TOKEN = Bearer ${cleanToken}`);

console.log('\n✅ Copy and paste these values into Vercel to link Frontend to Backend.');
console.log('====================================\n');
