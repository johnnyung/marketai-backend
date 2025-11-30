import marketDataService from './marketDataService.js';

interface RotationSignal {
  parent_sector: string;
  winning_sub_sector: string;
  ticker: string; // The ETF ticker
  alpha_spread: number; // How much it beat the parent
  reason: string;
}

// Map Parent Sectors to specific Niche ETFs
const SECTOR_MAP = [
    // Technology
    { parent: 'XLK', child: 'SOXX', name: 'Semiconductors' },
    { parent: 'XLK', child: 'IGV', name: 'Software' },
    { parent: 'XLK', child: 'CIBR', name: 'Cybersecurity' },
    
    // Energy
    { parent: 'XLE', child: 'OIH', name: 'Oil Services' },
    { parent: 'XLE', child: 'XOP', name: 'Oil Exploration' },
    { parent: 'XLE', child: 'URA', name: 'Uranium' },
    
    // Financials
    { parent: 'XLF', child: 'KRE', name: 'Regional Banks' },
    { parent: 'XLF', child: 'IAI', name: 'Broker-Dealers' },
    
    // Healthcare
    { parent: 'XLV', child: 'XBI', name: 'Biotech' },
    { parent: 'XLV', child: 'IHI', name: 'Medical Devices' },
    
    // Discretionary
    { parent: 'XLY', child: 'XHB', name: 'Homebuilders' },
    { parent: 'XLY', child: 'PEJ', name: 'Leisure & Entertainment' }
];

class ShadowRotationService {

  async detectRotation(): Promise<RotationSignal[]> {
    console.log('      🌘 Shadow Radar: Scanning Sub-Sector Alpha...');
    const signals: RotationSignal[] = [];

    try {
        // 1. Get List of all tickers needed (Parents + Children)
        const parents = [...new Set(SECTOR_MAP.map(m => m.parent))];
        const children = SECTOR_MAP.map(m => m.child);
        const allTickers = [...parents, ...children];

        // 2. Batch Fetch Prices
        const prices = await marketDataService.getMultiplePrices(allTickers);

        // 3. Compare Relative Strength
        for (const map of SECTOR_MAP) {
            const parentQ = prices.get(map.parent);
            const childQ = prices.get(map.child);

            if (parentQ && childQ) {
                // Simple Alpha: Child Daily Change - Parent Daily Change
                // (In a full version, this would use 5-day returns, but daily is a good proxy for momentum)
                const alpha = childQ.changePercent - parentQ.changePercent;

                // Threshold: Sub-sector beating parent by > 0.75% today
                if (alpha > 0.75) {
                    signals.push({
                        parent_sector: map.parent,
                        winning_sub_sector: map.name,
                        ticker: map.child,
                        alpha_spread: parseFloat(alpha.toFixed(2)),
                        reason: `Rotation into ${map.name} (${map.child}): Outperforming ${map.parent} by ${alpha.toFixed(2)}%`
                    });
                    console.log(`      -> Detected flow into ${map.name} (+${alpha.toFixed(2)}% alpha)`);
                }
            }
        }

        return signals;

    } catch (e) {
        console.error("Shadow Rotation Error:", e);
        return [];
    }
  }
}

export default new ShadowRotationService();
