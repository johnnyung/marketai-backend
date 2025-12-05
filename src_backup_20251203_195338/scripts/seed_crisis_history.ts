import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// RICH HISTORICAL DATA SPECIFIC TO CURRENT EVENTS
const CRISIS_DB = [
  {
    event: "1998 Clinton Impeachment Scandal",
    date: "1998-01-21",
    type: "Political Scandal",
    description: "Presidential scandal creates massive uncertainty. Markets hate uncertainty.",
    market_impact: -19.3,
    duration_days: 45,
    affected_sectors: ["General Market (Sell)", "Tech (Buy/Safe Haven)", "Bonds (Buy)"],
    recovery_pattern: "Initial panic selling (-19%) followed by a massive 'Relief Rally' (+28%) once the political outcome became clear. Tech detached from the broader market and soared.",
    keywords: ["impeachment", "clinton", "scandal", "epstein", "president", "investigation", "legal", "trump"]
  },
  {
    event: "2008 Global Financial Crisis",
    date: "2008-09-15",
    type: "Systemic Crash",
    description: "Banking system collapse. Credit freeze.",
    market_impact: -56.8,
    duration_days: 517,
    affected_sectors: ["Financials (Crash)", "Real Estate (Crash)", "Gold (Rally)"],
    recovery_pattern: "Slow grind. Gold and Dollar were the only true hedges.",
    keywords: ["bank", "collapse", "recession", "bailout", "housing", "debt"]
  },
  {
    event: "2018 Trade War (Trump)",
    date: "2018-03-22",
    type: "Policy Shock",
    description: "Aggressive tariffs on China.",
    market_impact: -10.2,
    duration_days: 90,
    affected_sectors: ["Manufacturing (Sell)", "Domestic Small Caps (Buy)", "Steel (Buy)"],
    recovery_pattern: "Volatile consolidation. Companies with domestic supply chains outperformed.",
    keywords: ["tariff", "trade", "china", "trump", "tax"]
  }
];

async function seed() {
  console.log('🌱 Seeding Crisis Knowledge...');
  
  // Update existing or insert new
  for (const item of CRISIS_DB) {
    // Check if exists
    const exists = await pool.query("SELECT id FROM historical_events WHERE event = $1", [item.event]);
    
    if (exists.rows.length > 0) {
        // Update with richer data
        await pool.query(`
            UPDATE historical_events SET
            description = $2,
            recovery_pattern = $3,
            keywords = $4,
            affected_sectors = $5
            WHERE event = $1
        `, [item.event, item.description, item.recovery_pattern, item.keywords, JSON.stringify(item.affected_sectors)]);
    } else {
        // Insert new
        await pool.query(`
          INSERT INTO historical_events
          (event, event_date, event_type, description, market_impact, duration_days, affected_sectors, recovery_pattern, keywords)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          item.event, item.date, item.type, item.description,
          item.market_impact, item.duration_days,
          JSON.stringify(item.affected_sectors), item.recovery_pattern, item.keywords
        ]);
    }
  }
  
  console.log(`✅ Injected ${CRISIS_DB.length} crisis scenarios.`);
  process.exit(0);
}

seed();
