// src/scripts/purgeMockData.ts
import pool from '../db/index.js';

async function purgeMockData() {
  console.log('🗑️  Purging all mock/simulated data...');
  
  // Delete mock data from raw_data_collection
  const result1 = await pool.query(`
    DELETE FROM raw_data_collection 
    WHERE data_json::text LIKE '%simulated%' 
    OR data_json::text LIKE '%mock%'
    OR source_name IN (
      'Options Flow', 'Twitter Sentiment', 'StockTwits', 'Financial News',
      'Press Releases', 'Insider Trading', 'Political News', 'Extended Hours',
      'Geopolitical Events', 'Economic Indicators', 'Institutional Holdings',
      'Financial Influencers', 'Earnings Transcripts', 'Hedge Fund Activity',
      'Dark Pool Activity', 'SPAC Mergers', 'Short Interest', 'Discord Trading Groups',
      'OpenInsider', 'Market Indices', 'ETF Flows', 'Treasury Yields', 'IPO Filings',
      'Analyst Ratings', 'NFT Market', 'Finnhub News', 'Futures Prices',
      'Executive Compensation', 'Whale Movements', 'CEO/CFO Interviews',
      'Fed Interest Rates', 'FDA Approvals', 'Activist Investors', 'Dollar Index',
      'Finnhub Quote', 'Commodity Prices'
    )
  `);
  
  console.log(`✅ Deleted ${result1.rowCount} mock entries from raw_data_collection`);
  
  // Keep only real sources
  const realSources = await pool.query(`
    SELECT DISTINCT source_name, COUNT(*) as count
    FROM raw_data_collection
    GROUP BY source_name
    ORDER BY count DESC
  `);
  
  console.log('\n✅ Remaining REAL data sources:');
  realSources.rows.forEach(r => {
    console.log(`   ${r.source_name}: ${r.count} items`);
  });
  
  process.exit(0);
}

purgeMockData();
