import fmpService from './fmpService.js';
import pool from '../db/index.js';

// The "Titans" - ETFs that define the market structure
const TARGET_ETFS = [
    // GLOBAL / BROAD
    'VT',   // Vanguard Total World Stock
    'VTI',  // Total US Stock
    'VEA',  // Developed Markets (ex-US)
    'VWO',  // Emerging Markets
    
    // SECTORS
    'XLK',  // Tech
    'XLF',  // Financials
    'XLV',  // Healthcare
    'XLE',  // Energy
    'XLI',  // Industrials
    
    // THEMATIC / HIGH BETA
    'SMH',  // Semiconductors
    'ARKK', // Innovation
    'TAN',  // Solar/Clean Energy
    
    // ASSET CLASSES
    'TLT',  // 20+ Year Treasury
    'GLD',  // Gold
    'USO'   // Oil
];

class GlobalEtfUniverseEngine {

  /**
   * Run the full discovery cycle.
   * Fetches holdings for all Target ETFs and updates the DB.
   */
  async runDiscoveryCycle() {
      console.log(`🌍 GEUI: Starting Global Discovery Cycle on ${TARGET_ETFS.length} Titans...`);
      let newTickersFound = 0;
      let totalRecords = 0;

      for (const etf of TARGET_ETFS) {
          try {
              // console.log(`   Scanning ${etf}...`);
              const holdings = await fmpService.getEtfHoldings(etf);
              
              if (!holdings || holdings.length === 0) {
                  // console.warn(`   ⚠️ No holdings found for ${etf}`);
                  continue;
              }

              // Filter for meaningful weight (> 0.05%) to reduce noise
              const significant = holdings.filter((h: any) => h.weightPercentage > 0.05);

              for (const asset of significant) {
                  const saved = await this.upsertConstituent(etf, asset);
                  if (saved) totalRecords++;
              }
              
          } catch (error) {
              console.error(`   ❌ Error scanning ${etf}:`, error);
          }
      }

      console.log(`🌍 GEUI Cycle Complete. Processed ${totalRecords} significant holdings.`);
  }

  /**
   * Returns a list of ETFs that hold a specific ticker.
   * Useful for "Institutional Support" analysis.
   */
  async getEtfSupport(ticker: string): Promise<string[]> {
      try {
          const res = await pool.query(
              `SELECT etf_ticker, weight_percent FROM global_etf_constituents WHERE asset_ticker = $1 ORDER BY weight_percent DESC`,
              [ticker]
          );
          return res.rows.map(r => r.etf_ticker);
      } catch (e) {
          return [];
      }
  }

  /**
   * Returns top 10 tickers discovered in a specific ETF.
   */
  async getTopHoldings(etf: string): Promise<any[]> {
      try {
          const res = await pool.query(
              `SELECT asset_ticker, asset_name, weight_percent FROM global_etf_constituents WHERE etf_ticker = $1 ORDER BY weight_percent DESC LIMIT 10`,
              [etf]
          );
          return res.rows;
      } catch (e) {
          return [];
      }
  }

  private async upsertConstituent(etf: string, asset: any): Promise<boolean> {
      try {
          // FMP returns { asset: 'AAPL', sharesNumber: 123, weightPercentage: 5.4, ... }
          await pool.query(
              `INSERT INTO global_etf_constituents (etf_ticker, asset_ticker, asset_name, weight_percent, shares_held, updated_at)
               VALUES ($1, $2, $3, $4, $5, NOW())
               ON CONFLICT (etf_ticker, asset_ticker)
               DO UPDATE SET weight_percent = $4, shares_held = $5, updated_at = NOW()`,
              [
                  etf,
                  asset.asset || 'UNKNOWN',
                  asset.name || 'Unknown Asset',
                  asset.weightPercentage || 0,
                  asset.sharesNumber || 0
              ]
          );
          return true;
      } catch (e) {
          return false;
      }
  }
}

export default new GlobalEtfUniverseEngine();
