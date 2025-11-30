import axios from 'axios';

async function test() {
    try {
        const res = await axios.get('http://localhost:3001/api/gamma/analyze/AAPL');
        const data = res.data;
        
        console.log("   📊 Response Received:");
        console.log(JSON.stringify(data, null, 2));

        if (data.success && data.data && data.data.volatility_regime) {
            console.log("\n   ✅ SUCCESS: 'volatility_regime' is present.");
            process.exit(0);
        } else {
            console.log("\n   ❌ FAILURE: Field still missing.");
            process.exit(1);
        }
    } catch (e: any) {
        console.log(`   ❌ Connection Failed: ${e.message}`);
        process.exit(1);
    }
}

test();
