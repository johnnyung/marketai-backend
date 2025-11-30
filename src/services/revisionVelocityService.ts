import fmpService from './fmpService.js';

interface RevisionMetrics {
  ticker: string;
  velocity_score: number; // 0-100
  upgrade_momentum: 'ACCELERATING' | 'STABLE' | 'DECELERATING';
  target_change_30d: number; // %
  consensus_rating: string;
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  reason: string;
}

class RevisionVelocityService {

  async analyzeVelocity(ticker: string): Promise<RevisionMetrics> {
    // console.log(`      🚀 Revision Velocity: Analyzing ${ticker}...`);
    
    const result: RevisionMetrics = {
        ticker,
        velocity_score: 50,
        upgrade_momentum: 'STABLE',
        target_change_30d: 0,
        consensus_rating: 'Unknown',
        recommendation: 'HOLD',
        reason: 'Data Unavailable'
    };

    try {
        // 1. Get Price Targets History (using existing FMP service)
        // FMP usually returns current, but we can infer trend from 'upgrades_downgrades' endpoint if available,
        // or by comparing current consensus to previous if stored.
        // Since we don't store history yet, we'll use the analyst-estimates trend.
        
        // Fetch Analyst Estimates (Forward looking)
        const estimates = await fmpService.getAnalystEstimates(ticker); // Returns array if modified in previous steps, let's assume object based on fmpService logic
        // Actually fmpService.getAnalystEstimates returns a SINGLE object in current implementation (limit=1).
        // We need history to calc velocity. 
        
        // Let's use the 'upgrades-downgrades' endpoint which provides a feed of changes.
        // Implementing direct fetch here since it's specific to this service.
        const changes = await (fmpService as any).getUpgradesDowngrades?.(ticker); // We will add this to FMP Service below.
        
        if (!changes || changes.length === 0) return result;

        // 2. Calculate Velocity (Last 30 Days)
        const now = new Date();
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
        
        const recent = changes.filter((c: any) => new Date(c.publishedDate) > thirtyDaysAgo);
        
        const upgrades = recent.filter((c: any) => c.newGrade > c.previousGrade || c.action === 'up').length;
        const downgrades = recent.filter((c: any) => c.newGrade < c.previousGrade || c.action === 'down').length;
        const netRevisions = upgrades - downgrades;

        // 3. Scoring
        let score = 50 + (netRevisions * 10); // +10 per net upgrade
        score = Math.min(100, Math.max(0, score));

        result.velocity_score = score;
        result.target_change_30d = netRevisions; // Proxy
        
        if (netRevisions > 2) {
            result.upgrade_momentum = 'ACCELERATING';
            result.recommendation = 'BUY';
            result.reason = `Estimate Explosion: ${upgrades} upgrades vs ${downgrades} downgrades in 30d.`;
        } else if (netRevisions < -2) {
             result.upgrade_momentum = 'DECELERATING';
             result.recommendation = 'SELL';
             result.reason = `Falling Knife: ${downgrades} downgrades vs ${upgrades} upgrades.`;
        } else {
            result.reason = "Analyst consensus is stable.";
        }
        
        return result;

    } catch (e) {
        // console.error("Revision Analysis Failed:", e);
        return result;
    }
  }
}

export default new RevisionVelocityService();
