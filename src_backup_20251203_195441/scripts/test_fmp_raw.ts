import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load env for local testing convenience
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function runRawTest() {
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) {
        console.error('❌ NO API KEY FOUND in process.env');
        process.exit(1);
    }

    const symbol = 'AAPL';
// LEGACY_PRESERVED: const url = `https://financialmodelingprep.comSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable *//quote/${symbol}?apikey=${apiKey}`;
// LEGACY_PRESERVED: const url = `https://financialmodelingprep.comSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable *//quote/${symbol}?apikey=${apiKey}`;
// LEGACY_PRESERVED: const url = `https://financialmodelingprep.comSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable *//quote/${symbol}?apikey=${apiKey}`;
    const url = `https://financialmodelingprep.com/apifinancialmodelingprep.com/stablequote/${symbol}?apikey=${apiKey}`;
    
    console.log('\n🧪 RAW FMP CONNECTIVITY TEST');
    console.log('-----------------------------');
    console.log(`URL: ${url.replace(apiKey, 'HIDDEN')}`);

    try {
        const response = await axios.get(url, { timeout: 5000 });
        console.log(`✅ Status: ${response.status} ${response.statusText}`);
        console.log('📦 Headers:', JSON.stringify(response.headers['content-type']));
        
        const data = response.data;
        const preview = JSON.stringify(data).substring(0, 300);
        console.log(`📄 Body Preview: ${preview}`);

        if (Array.isArray(data) && data.length > 0 && data[0].symbol === symbol) {
            console.log('✅ SUCCESS: Valid JSON array returned.');
            process.exit(0);
        } else {
            console.error('❌ FAILURE: Data empty or malformed.');
            process.exit(1);
        }
    } catch (error: any) {
        console.error('❌ NETWORK ERROR:');
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Data: ${JSON.stringify(error.response.data)}`);
        } else {
            console.error(`   Message: ${error.message}`);
        }
        process.exit(1);
    }
}

runRawTest();
