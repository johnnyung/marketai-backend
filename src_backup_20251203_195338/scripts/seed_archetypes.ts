import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ABSTRACT PATTERNS (Not just specific events)
const ARCHETYPES = [
  {
    event: "US Brand Hostile Market Expansion",
    type: "Market Expansion",
    description: "A major US consumer/tech brand enters a difficult foreign market (China/India).",
    market_impact: 15.5,
    duration_days: 365,
    affected_sectors: ["Consumer Discretionary", "Tech"],
    recovery_pattern: "Short-term CAPEX drag, Long-term revenue explosion.",
    keywords: ["expansion", "china", "india", "new market", "launch", "entry"]
  },
  {
    event: "Institutional Rotation (Smart Money Flip)",
    type: "Capital Flow",
    description: "Major funds (Buffett/Ackman) exit one sector to enter a competitor.",
    market_impact: -5.0, // Initial drop for the sold stock
    duration_days: 90,
    affected_sectors: ["Target Sector"],
    recovery_pattern: "The 'bought' stock outperforms the 'sold' stock by 20% over 6 months.",
    keywords: ["buffett", "ackman", "sold", "bought", "stake", "13f", "position"]
  },
  {
    event: "Disruptive Competitor Launch",
    type: "Competition",
    description: "A new entrant (e.g. SpaceX) threatens an incumbent (e.g. Boeing/Blue Origin).",
    market_impact: -12.0,
    duration_days: 180,
    affected_sectors: ["Industrials", "Tech"],
    recovery_pattern: "Incumbent stock bleeds slowly. Competitor (if public) or proxy soars.",
    keywords: ["launch", "competitor", "disrupt", "rival", "announce", "unveil"]
  },
  {
    event: "Regulatory Antitrust Crackdown",
    type: "Regulation",
    description: "Government sues major monopoly (e.g. DOJ vs Microsoft, DOJ vs Google).",
    market_impact: -22.0,
    duration_days: 730,
    affected_sectors: ["Tech", "Comms"],
    recovery_pattern: "Dead money for 1-2 years during trial. Breakup often unlocks value later.",
    keywords: ["antitrust", "doj", "sue", "monopoly", "breakup", "regulation"]
  },
  {
    event: "Supply Chain Shock (Resource Nationalism)",
    type: "Supply Chain",
    description: "Country restricts export of critical resource (e.g. Oil, Chips, Rare Earths).",
    market_impact: -8.5,
    duration_days: 120,
    affected_sectors: ["Manufacturing", "Semiconductors"],
    recovery_pattern: "Prices of the commodity spike. Domestic producers rally.",
    keywords: ["export", "ban", "shortage", "supply", "critical", "hoard"]
  }
];

async function seed() {
  console.log('🌱 Seeding Archetype Library...');
  
  // Using the existing historical_events table but adding abstract archetypes
  for (const item of ARCHETYPES) {
    const res = await pool.query("SELECT id FROM historical_events WHERE event = $1", [item.event]);
    if (res.rows.length === 0) {
        await pool.query(`
          INSERT INTO historical_events
          (event, event_date, event_type, description, market_impact, duration_days, affected_sectors, recovery_pattern, keywords, collected_at)
          VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, NOW())
        `, [
          item.event, item.type, item.description, item.market_impact, item.duration_days,
          JSON.stringify(item.affected_sectors), item.recovery_pattern, item.keywords
        ]);
    }
  }
  
  console.log(`✅ Injected ${ARCHETYPES.length} Strategic Archetypes.`);
  process.exit(0);
}

seed();
