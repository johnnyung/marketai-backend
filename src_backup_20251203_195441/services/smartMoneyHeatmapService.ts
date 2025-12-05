import institutionalFlowService from './institutionalFlowService.js';

interface HeatmapSector {
  name: string;
  net_flow_score: number;
  institutional_activity: 'High' | 'Medium' | 'Low';
  top_tickers: any[];
}

interface SmartMoneyDashboard {
  heatmap: HeatmapSector[];
  top_accumulation: any[];
  top_distribution: any[];
  dark_pool_trends: any[];
  options_whales: any[];
  generated_at: string;
}

class SmartMoneyHeatmapService {
  
  async getDashboard(): Promise<SmartMoneyDashboard> {
      // Use real flows or return empty
      const flows = await institutionalFlowService.scanFlows();
      
      // Transform flows into heatmap if available, else empty
      // NO MOCK SECTORS ALLOWED.
      
      return {
          heatmap: [], // Populate only with real aggregated data
          top_accumulation: flows.filter(f => f.intensity > 50),
          top_distribution: [],
          dark_pool_trends: [],
          options_whales: [],
          generated_at: new Date().toISOString()
      };
  }
}

export default new SmartMoneyHeatmapService();
