import dotenv from 'dotenv';
import { Pool } from 'pg';
import comprehensiveDataEngine from '../services/comprehensiveDataEngine.js';
import intelligentDigestService from '../services/intelligentDigestService.js';
import cryptoStockCorrelationService from '../services/cryptoStockCorrelation.js';

// Load environment variables
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initRealData() {
  console.log('🔌 Connecting to Real Data Sources...');

  try {
    // A. Run Comprehensive Collection (RSS, Crypto, History)
    console.log('\n1️⃣  Fetching Historical & Macro Data...');
    const compResult = await comprehensiveDataEngine.runComprehensiveCollection();
    console.log('   Results:', JSON.stringify(compResult));

    // B. Run Digest Ingestion (News, Reddit, SEC)
    console.log('\n2️⃣  Ingesting Live News & Social...');
    const digestResult = await intelligentDigestService.ingestAndStore();
    
    // Update Stats Table
    await pool.query(`
      INSERT INTO collection_stats (sources, last_run, total_collected, total_stored)
      VALUES ($1, NOW(), $2, $3)
    `, [JSON.stringify(digestResult.sources), digestResult.collected, digestResult.stored]);
    
    console.log(`   Collected: ${digestResult.collected}, Stored: ${digestResult.stored}`);

    // C. Run Crypto Correlation
    console.log('\n3️⃣  Analyzing Crypto Correlations...');
    await cryptoStockCorrelationService.collectCryptoPrices();
    await cryptoStockCorrelationService.generatePrediction();
    console.log('   Crypto analysis complete.');

    console.log('\n✅ INITIALIZATION COMPLETE.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Initialization Failed:', error);
    process.exit(1);
  }
}

initRealData();
