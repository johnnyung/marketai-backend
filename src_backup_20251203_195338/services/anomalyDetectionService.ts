class AnomalyDetectionService {
  async scoreEntry(title: string, summary: string, sourceType: string) {
      return { score: 0, type: 'NEUTRAL' };
  }
  async processRecentEntries() {}
  async getTopAnomalies() { return []; }
  async getHeatmapData() { return []; }
}
export default new AnomalyDetectionService();
