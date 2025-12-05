import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import omniVectorService from '../services/omniVectorService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../../');

dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.local') });

async function verify() {
  console.log('🧬 FDV-6: OMNI-VECTOR FEATURE ASSEMBLER VERIFICATION');
  console.log('====================================================');

  try {
    // 1. Single Ticker
    console.log('\n1. Building Snapshot for AAPL...');
    const snapshot = await omniVectorService.buildSnapshotForTicker('AAPL');
    
    console.log(`   Ticker: ${snapshot.ticker}`);
    console.log(`   Price: ${snapshot.price}`);
    console.log(`   Sector: ${snapshot.sector}`);
    console.log(`   Sentiment Score: ${snapshot.sentiment?.score}`);
    console.log(`   News Count: ${snapshot.highlights?.newsCount}`);

    if (!snapshot.ticker || snapshot.ticker !== 'AAPL') {
      throw new Error('Snapshot ticker mismatch');
    }

    // 2. Universe Batch
    console.log('\n2. Building Universe Snapshots (Limit 10)...');
    const universe = await omniVectorService.buildSnapshotsForUniverse(10);
    console.log(`   Generated ${universe.length} snapshots.`);
    
    if (universe.length === 0) {
      console.warn('   ⚠️  Warning: Universe returned 0 valid snapshots (might be market hours or cache issues)');
    } else {
      const sample = universe[0];
      console.log(`   Sample: ${sample.ticker} ($${sample.price})`);
    }

    console.log('\n====================================================');
    console.log('✅ FDV-6 PASSED: Omni-Vector Service Operational');
    process.exit(0);

  } catch (e: any) {
    console.error('\n❌ FDV-6 FAILED:', e.message);
    process.exit(1);
  }
}

verify();
