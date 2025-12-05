import pool from '../db/index.js';
import axios from 'axios';
import fmpService from './fmpService.js';

const STABLE_BASE = 'https://financialmodelingprep.com/stable';

interface HealthReport {
  source: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  latency_ms: number;
  items_found: number;
  error?: string;
}

class SourceGuardService {

  async runHealthCheck() {
    console.log('   🛡️  Source Guard: Running System Health Check...');
    
    const report: HealthReport[] = [];

    // 1. CHECK FMP STABLE
    const fmpStart = Date.now();
    try {
        // We test the exact endpoint structure we rely on
        const q = await fmpService.getPrice('AAPL');
        if (q) {
            report.push({
                source: 'FMP Stable',
                status: 'ONLINE',
                latency_ms: Date.now() - fmpStart,
                items_found: 1
            });
        } else {
            report.push({
                source: 'FMP Stable',
                status: 'DEGRADED',
                latency_ms: Date.now() - fmpStart,
                items_found: 0,
                error: 'Returned null data'
            });
        }
    } catch (e: any) {
        report.push({
            source: 'FMP Stable',
            status: 'OFFLINE',
            latency_ms: Date.now() - fmpStart,
            items_found: 0,
            error: e.message
        });
    }

    // 2. CHECK GOOGLE RSS PROXY (Gov Data)
    const govStart = Date.now();
    try {
        const url = `https://news.google.com/rss/search?q=Federal+Reserve+Rates&hl=en-US&gl=US&ceid=US:en`;
        const res = await axios.get(url, { timeout: 5000 });
        const hasData = res.data.length > 500; // Crude check for XML content
        
        report.push({
            source: 'Gov/RSS Proxy',
            status: hasData ? 'ONLINE' : 'OFFLINE',
            latency_ms: Date.now() - govStart,
            items_found: hasData ? 10 : 0 // Estimate
        });
    } catch (e: any) {
        report.push({ source: 'Gov/RSS Proxy', status: 'OFFLINE', latency_ms: 0, items_found: 0, error: e.message });
    }

    // 3. LOG TO DATABASE (Persistent Tracking)
    await this.persistHealth(report);
    
    return report;
  }

  private async persistHealth(reports: HealthReport[]) {
      for (const r of reports) {
          await pool.query(`
            INSERT INTO system_status (source_id, status, message, count, last_updated)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (source_id) DO UPDATE
            SET status = $2, message = $3, count = $4, last_updated = NOW()
          `, [r.source.replace(' ', '_').toLowerCase(), r.status === 'ONLINE' ? 'active' : 'error', r.error || 'Healthy', r.items_found]);
      }
  }
}

export default new SourceGuardService();
