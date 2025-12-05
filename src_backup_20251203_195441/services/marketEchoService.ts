import { StubUtils } from '../utils/stubUtils.js';

interface MarketEcho {
  event_name: string;
  resonance_score: number;
  narrative_parallel: string;
  affected_sectors: string[];
}

class MarketEchoService {
  
  async detectEchoes(): Promise<MarketEcho[]> {
      // MVL: Return structured degraded state instead of empty array
      // This tells the UI we checked but found nothing, vs "system error"
      return StubUtils.getDegradedMarketEcho();
  }

  async getActiveEchoes() {
      return this.detectEchoes();
  }
}

export default new MarketEchoService();
