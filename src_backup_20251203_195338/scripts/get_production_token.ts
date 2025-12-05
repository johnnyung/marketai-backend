import jwt from 'jsonwebtoken';

// STRICT: Only use process.env. NO dotenv loading here.
// This ensures we only generate tokens using the REAL injected secret.

const secret = process.env.JWT_SECRET;

if (!secret) {
    console.error('\n❌ ERROR: JWT_SECRET is not set in this environment.');
    console.error('   If running locally, ensure .env.local is loaded manually.');
    console.error('   If running on Railway, check your Variables tab.\n');
    process.exit(1);
}

const payload = {
    userId: 1,
    id: 1,
    username: "admin",
    email: "admin@marketai.com",
    role: "admin"
};

console.log('\n🔐 GENERATING PRODUCTION ADMIN TOKEN');
console.log('-------------------------------------');
console.log(`Target Env:  ${process.env.NODE_ENV || 'unknown'}`);
console.log(`Secret Hash: ${secret.substring(0, 5)}...`);

const token = jwt.sign(payload, secret, { expiresIn: '120d', algorithm: 'HS256' });

console.log('\n👉 COPY THE LINE BELOW FOR VERCEL/HEADERS:');
console.log(`Bearer ${token}`);
console.log('-------------------------------------\n');
