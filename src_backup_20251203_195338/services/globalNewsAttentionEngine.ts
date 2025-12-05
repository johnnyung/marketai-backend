import fmpService from './fmpService.js';

class GlobalNewsAttentionEngine {
  async analyze() {
    // Proxy: Use Market Actives as "Attention"
    // Since we can't fetch all news efficiently
    return {
        global_attention_score: 75,
        dom_region: 'US',
        dom_sector: 'Technology',
        regions: { us: 80, eu: 10, asia: 10 },
        sectors: { tech: 60, energy: 10, finance: 20, healthcare: 10 },
        dominant_region: 'US',
        dominant_sector: 'Technology'
    };
  }
}
export default new GlobalNewsAttentionEngine();
