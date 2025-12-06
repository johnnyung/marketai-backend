import { pool } from '../db/index.js';
import liveStatusService from './liveStatusService.js';
import researchAgentService from './researchAgentService.js';
import sectorDiscoveryService from './sectorDiscoveryService.js';
import marketDataService from './marketDataService.js';
import anomalyDetectionService from './anomalyDetectionService.js';
import newsImpactEngine from './newsImpactEngine.js'; // NIE v2.0

// Collectors
import { collectFinancialNews } from './collectors/newsCollector.js';
import { collectApiData } from './collectors/apiDataCollector.js';
import { collectFredData } from './collectors/fredCollector.js';
import { collectCongressTrades } from './collectors/congressCollector.js';
import { collectWhaleActivity } from './collectors/whaleCollector.js';
import { collectTariffNews } from './collectors/tariffCollector.js';
import { collectYoutubeData } from './collectors/youtubeCollector.js';
import { collectInsiderTrades } from './collectors/insiderCollector.js';
import { collectPoliticalData } from './collectors/politicalCollector.js';
import { collectCoinGecko } from './collectors/cryptoCollector.js';

// Extended Services
import expandedSocialService from './expandedSocialService.js';
import manufacturingSupplyChainService from './manufacturingSupplyChainService.js';
import governmentDataService from './governmentDataService.js';
import newsEmbeddingService from './newsEmbeddingService.js';
import redditService from './redditService.js';

export class MasterIngestionService {
  
  private async ensureWidgetStatus() {
      const widgets = ['news','fmp','alpha','coingecko','fred','congress','whitehouse','tariff','social','whale','youtube','sec','manufacturing','defense'];
      for(const id of widgets) {
          await pool.query(`
            INSERT INTO system_status (source_id, status, message, count, last_updated)
            VALUES ($1, 'cached', 'Ready', 0, NOW()) ON CONFLICT (source_id) DO NOTHING
          `, [id]);
      }
  }

  async runFullIngestion() {
    console.log('🚀 STARTING LIVE VISUAL INGESTION (v113.1)...');
    await this.ensureWidgetStatus();
    
    await this.runSectorDragnet();

    // Primary Collectors
    await this.processSource('news', 'News Feeds', collectFinancialNews);
    await this.processSource('fmp', 'Market Data', collectApiData);
    await this.processSource('coingecko', 'CoinGecko', collectCoinGecko);
    await this.processSource('fred', 'FRED Data', collectFredData);
    await this.processSource('congress', 'Congress Trading', collectCongressTrades);
    await this.processSource('whitehouse', 'White House', collectPoliticalData);
    await this.processSource('tariff', 'Tariff Monitor', collectTariffNews);
    await this.processSource('whale', 'Whale Alert', collectWhaleActivity);
    await this.processSource('youtube', 'YouTube', collectYoutubeData);
    await this.processSource('sec', 'SEC EDGAR', collectInsiderTrades);

    // Extended Intelligence
    await this.runExtendedCollector('social', 'Reddit/Social', async () => {
        await redditService.getWallStreetBetsHot(25);
        const posts = await expandedSocialService.getRedditInvestingSentiment();
        return posts.map(p => ({ ...p, category: 'social', source: p.source }));
    });

    await this.runExtendedCollector('manufacturing', 'Supply Chain', async () => {
        const data = await manufacturingSupplyChainService.getManufacturingData();
        return data.map(d => ({ ...d, category: 'manufacturing', source: d.source }));
    });

    await this.runExtendedCollector('defense', 'Defense Dept', async () => {
        const data = await governmentDataService.getDefenseContracts();
        return data.map(d => ({ ...d, category: 'government', source: 'Defense Dept' }));
    });

    await anomalyDetectionService.processRecentEntries();
    await this.runAutonomousResearch();

    return { success: true };
  }

  private async runSectorDragnet() {
      console.log("   🕸️  Running Sector Dragnet (Wide-Net)...");
      const targets = await sectorDiscoveryService.getExpandedUniverse();
      console.log(`      -> Tracking ${targets.length} assets in active universe.`);
  }

  private async processSource(id: string, name: string, collectorFn: () => Promise<any[]>) {
    liveStatusService.update(id, 'scanning', 'Scanning...');
    try {
      const items = await collectorFn();
      if (!items || items.length === 0) {
        liveStatusService.update(id, 'cached', 'Active', 0);
        return;
      }
      const stats = await this.batchStore(items);
      
      // --- NIE INTEGRATION ---
      if (id === 'news' || id === 'whitehouse' || id === 'sec' || id === 'tariff') {
          await newsImpactEngine.analyzeBatch(items);
      }
      // -----------------------

      liveStatusService.update(id, 'new_data', `Found ${stats.inserted}`, stats.inserted);
    } catch (error: any) {
      liveStatusService.update(id, 'error', 'Failed');
      console.error(`   ❌ ${name} Failed:`, error.message);
    }
  }

  private async runExtendedCollector(id: string, name: string, collectorFn: () => Promise<any[]>) {
      liveStatusService.update(id, 'scanning', 'Scanning...');
      try {
          const items = await collectorFn();
          if (items.length > 0) {
              const stats = await this.batchStore(items);
              liveStatusService.update(id, 'new_data', `Found ${stats.inserted}`, stats.inserted);
          } else {
              liveStatusService.update(id, 'cached', 'Monitoring', 0);
          }
      } catch (e: any) {
          liveStatusService.update(id, 'error', 'Failed');
      }
  }

  private async batchStore(items: any[]) {
    let inserted = 0;
    for (const item of items) {
        try {
            const contentHash = item.external_id || item.url || JSON.stringify(item);
            await pool.query(`
              INSERT INTO raw_data_collection (source_type, source_name, data_json, collected_at)
              VALUES ($1, $2, $3, NOW())
            `, [item.category || 'general', item.source || 'Unknown', JSON.stringify(item)]);
            
            if (item.title) {
                 const res = await pool.query(`
                    INSERT INTO digest_entries (source_type, source_name, ai_summary, ai_relevance_score, ai_sentiment, event_date, content_hash, created_at)
                    VALUES ($1, $2, $3, 50, 'neutral', NOW(), $4, NOW())
                    ON CONFLICT (content_hash) DO NOTHING
                    RETURNING id
                 `, [item.category || 'general', item.source || 'Unknown', item.title, contentHash]);
                 
                 if (res.rows.length > 0) {
                     await newsEmbeddingService.processEntry(res.rows[0].id, item.title);
                 }
            }
            inserted++;
        } catch(e) {}
    }
    return { inserted, total: items.length };
  }

  private async runAutonomousResearch() {
    liveStatusService.update('research_agent', 'scanning', 'Analyzing...');
    try {
      const result: any = await researchAgentService.expandKnowledgeBase();
      liveStatusService.update('research_agent', result.expanded ? 'new_data' : 'cached', result.expanded ? 'New Insights' : 'Monitoring', result.added || 0);
    } catch (e) { liveStatusService.update('research_agent', 'error', 'Timeout'); }
  }
}

export default new MasterIngestionService();
