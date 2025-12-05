import { IntelligenceBundle } from '../types/intelligenceBundle.js';
import cryptoStockCorrelationService from './cryptoStockCorrelation.js';

interface UnifiedAlert {
  id: string;
  alert_type: 'crypto_correlation' | 'political_investigation' | 'market_anomaly' | 'combined_signal';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  confidence: number;
  data_sources: string[];
  affected_tickers: Array<{
    ticker: string;
    impact_prediction: number;
    recommendation: string;
    correlation_strength: number;
  }>;
  historical_precedent?: any;
  action_items: string[];
  timestamp: Date;
}

class UnifiedIntelligenceEngine {
  
  async generateUnifiedAnalysis(): Promise<UnifiedAlert[]> {
      const cryptoAlert = await this.analyzeCryptoCorrelation();
      const alerts: UnifiedAlert[] = [];
      if (cryptoAlert) alerts.push(cryptoAlert);
      return alerts;
  }

  private async analyzeCryptoCorrelation(): Promise<UnifiedAlert | null> {
      await cryptoStockCorrelationService.collectCryptoPrices();
      const status = await cryptoStockCorrelationService.getCorrelationStatus();
      
      if (!status.latest_prediction) return null;

      const pred = status.latest_prediction;
      
      if (pred.confidence_score < 0.70) return null;

      return {
          id: `CRYPTO-${Date.now()}`,
          alert_type: 'crypto_correlation',
          severity: 'high',
          title: `Crypto Signal: ${pred.predicted_direction}`,
          description: `Bitcoin movement suggests ${pred.predicted_direction} open.`,
          confidence: pred.confidence_score * 100,
          data_sources: ['Binance', 'FMP'],
          affected_tickers: [],
          action_items: ['Monitor pre-market'],
          timestamp: new Date()
      };
  }

  private async analyzePoliticalPatterns() { return null; }
  private async detectCombinedSignals() { return null; }
  
  // FIX: Added limit parameter
  async getLatestAlerts(limit: number = 10): Promise<UnifiedAlert[]> {
      return [];
  }
  
  async start() {}
}

export default new UnifiedIntelligenceEngine();
