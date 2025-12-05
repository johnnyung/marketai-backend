import fmpService from './fmpService.js';
import pool from '../db/index.js';

class DiagnosticsService {

  async runFullDiagnostics() {
    // Non-blocking check
    const fmpStatus = await fmpService.checkConnection();
    const dbStatus = await this.checkDatabaseIntegrity();
    
    // Scoring Logic:
    // Base 50.
    // DB Online: +25
    // FMP Online: +25
    // Even if FMP fails, we start at 75% (Operational but Degraded)
    let healthScore = 50;
    if (dbStatus) healthScore += 25;
    if (fmpStatus.success) healthScore += 25;
    
    // MODIFIER: NEVER drop below 0.8 (20% penalty max).
    // Previous 0.5 (50% penalty) was causing the empty list issues.
    const modifier = healthScore >= 90 ? 1.0 : 0.85;

    return {
        health_score: healthScore,
        modifier: modifier,
        status: healthScore > 80 ? 'HEALTHY' : 'DEGRADED',
        details: {
            fmp: fmpStatus.success ? 'ONLINE' : 'WARN: Using Cached/Fallback Data',
            db: dbStatus ? 'ONLINE' : 'OFFLINE'
        }
    };
  }

  private async checkDatabaseIntegrity() {
      try {
          await pool.query('SELECT 1');
          return true;
      } catch (e) { return false; }
  }
}

export default new DiagnosticsService();
