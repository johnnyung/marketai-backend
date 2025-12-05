import cryptoStockCorrelationService from '../services/cryptoStockCorrelation.js';

async function main() {
    console.log('Triggering Real Data Collection...');
    // FIX: Method exists now, so this call is valid
    await cryptoStockCorrelationService.collectCryptoPrices();
    console.log('Done.');
}

main().catch(console.error);
