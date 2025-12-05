import { generateContentHash } from '../utils/dataUtils.js';
import lazarusService from './lazarusService.js';

interface ManufacturingData {
  title: string;
  content: string;
  source: string;
  category: string;
  publishedDate: Date;
  url: string;
}

class ManufacturingSupplyChainService {
  
  private SOURCES = [
    { name: 'ISM Manufacturing', query: 'ISM Manufacturing Index Report', category: 'manufacturing' },
    { name: 'Supply Chain Dive', query: 'site:supplychaindive.com', category: 'supply_chain' },
    { name: 'FreightWaves', query: 'site:freightwaves.com', category: 'logistics' },
    { name: 'JOC Maritime', query: 'maritime shipping news port congestion', category: 'ports' },
    { name: 'IndustryWeek', query: 'site:industryweek.com manufacturing', category: 'industrial' }
  ];

  async getManufacturingData(): Promise<ManufacturingData[]> {
    const data: ManufacturingData[] = [];
    
    for (const src of this.SOURCES) {
      try {
        // Lazarus Protocol: Auto-Hop between Google and Bing
        const result = await lazarusService.fetchOrResurrect(src.query);

        if (result.success && result.data.length > 0) {
            result.data.slice(0, 5).forEach((entry: any) => {
               const title = entry.title?.[0] || '';
               const link = entry.link?.[0] || '';
               const pubDate = entry.pubDate?.[0] || Date.now();
               
               if (title && link) {
                   data.push({
                       title: title,
                       content: title,
                       source: src.name,
                       category: src.category,
                       publishedDate: new Date(pubDate),
                       url: link
                   });
               }
            });
            console.log(`  ✓ ${src.name}: ${result.data.length} items (${result.source_used})`);
        }
      } catch (error) {
        console.error(`  ✗ ${src.name} failed`);
      }
      
      await new Promise(r => setTimeout(r, 1000));
    }
    
    return data;
  }

  calculateRelevance(data: ManufacturingData): number {
    let score = 65;
    const text = `${data.title} ${data.content}`.toLowerCase();
    if (text.includes('shortage') || text.includes('disruption') || text.includes('record')) score += 15;
    return Math.min(100, score);
  }
}

export default new ManufacturingSupplyChainService();
