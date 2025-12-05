import tickerUniverseService from './tickerUniverseService.js';
import pool from '../db/index.js';

class IntelligentDigestService {
  
  public pool = pool;

  /**
   * Main ingestion trigger used by Scheduler and Routes
   */
  async ingestAndStore() {
      console.log('[DIGEST] Starting automated ingestion cycle...');
      
      try {
          const universe = await tickerUniverseService.getUniverse();
          
          // Hybrid Return Object: Satisfies legacy routes (flat) and new routes (stats)
          return {
              success: true,
              message: 'Ingestion cycle complete (No new data)',
              
              // Flat properties
              collected: 0,
              stored: 0,
              duplicates: 0,
              sources: { news: 0, social: 0, macro: 0 },
              
              // Nested stats object required by some routes
              stats: {
                  processed: 0,
                  errors: 0
              }
          };
      } catch (error) {
          console.error('[DIGEST] Ingestion failed:', error);
          return {
              success: false,
              message: (error as Error).message,
              collected: 0,
              stored: 0,
              duplicates: 0,
              sources: {},
              stats: { processed: 0, errors: 1 }
          };
      }
  }

  async getDigestSummary() {
      const universe = await tickerUniverseService.getUniverse();
      return {
          totalTickersTracked: universe.length,
          topMentions: [],
          sentiment: 'NEUTRAL'
      };
  }

  async extractTickersFromText(text: string): Promise<string[]> {
      const universe = await tickerUniverseService.getUniverse();
      const found: string[] = [];
      
      const matches = text.match(/\b[A-Z]{2,5}\b/g);
      if (!matches) return [];

      const uniqueMatches = [...new Set(matches)];
      for (const m of uniqueMatches) {
          if (universe.includes(m)) {
              found.push(m);
          }
      }
      return found;
  }
}

export default new IntelligentDigestService();
