import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const HISTORY_DATA = [
  // --- FINANCIAL CRISES ---
  {
    event: "2008 Global Financial Crisis",
    date: "2008-09-15",
    type: "Financial Crisis",
    description: "Lehman Brothers collapse triggers systemic banking failure.",
    market_impact: -46.5,
    sectors_affected: ["Financials", "Real Estate", "Consumer Discretionary"],
    recovery_pattern: "V-shaped recovery started March 2009 (6 months later). Tech led the way out.",
    keywords: ["bank", "subprime", "liquidity", "bailout", "recession"]
  },
  {
    event: "Dot-Com Bubble",
    date: "2000-03-10",
    type: "Asset Bubble",
    description: "Tech valuation bubble burst due to rising rates and lack of profits.",
    market_impact: -78.0, // Nasdaq
    sectors_affected: ["Technology", "Internet", "Telecom"],
    recovery_pattern: "L-shaped. Took 15 years for Nasdaq to reclaim highs.",
    keywords: ["tech", "valuation", "ipo", "overvalued", "rates"]
  },
  {
    event: "COVID-19 Crash",
    date: "2020-03-11",
    type: "Pandemic",
    description: "Global lockdowns triggered rapid bear market.",
    market_impact: -34.0,
    sectors_affected: ["Travel", "Energy", "Retail"],
    recovery_pattern: "Fastest recovery in history due to massive Fed stimulus. Tech/Remote work surged.",
    keywords: ["virus", "lockdown", "stimulus", "fed", "mask"]
  },

  // --- WARS & GEOPOLITICS ---
  {
    event: "Russia-Ukraine War",
    date: "2022-02-24",
    type: "War",
    description: "Invasion of Ukraine caused energy and commodity shock.",
    market_impact: -12.0,
    sectors_affected: ["Energy (+)", "Defense (+)", "European Stocks (-)"],
    recovery_pattern: "Inflation surge lingered, but markets adapted after 6 months.",
    keywords: ["war", "oil", "gas", "russia", "sanctions", "wheat"]
  },
  {
    event: "Gulf War I",
    date: "1990-08-02",
    type: "War",
    description: "Iraq invasion of Kuwait caused oil spike and recession fears.",
    market_impact: -16.0,
    sectors_affected: ["Oil (+)", "Airlines (-)", "Defense (+)"],
    recovery_pattern: "Market rallied 30% once 'Operation Desert Storm' began (certainty vs uncertainty).",
    keywords: ["oil", "middle east", "military", "desert storm"]
  },

  // --- POLITICAL / REGULATORY ---
  {
    event: "Trump Trade War",
    date: "2018-03-22",
    type: "Trade Policy",
    description: "Tariffs on Chinese goods triggered manufacturing slowdown fears.",
    market_impact: -10.2,
    sectors_affected: ["Manufacturing", "Semiconductors", "Agriculture"],
    recovery_pattern: "Choppy volatility. Markets rallied on any 'deal' news.",
    keywords: ["tariff", "china", "trade", "trump", "manufacturing"]
  },
  {
    event: "Brexit Referendum",
    date: "2016-06-23",
    type: "Political Shock",
    description: "UK vote to leave EU caused instant currency crash.",
    market_impact: -5.3,
    sectors_affected: ["European Banks", "FX (GBP)", "Exporters"],
    recovery_pattern: "Short sharp shock. US markets shrugged it off quickly.",
    keywords: ["brexit", "eu", "uk", "vote", "currency"]
  },

  // --- INFLATION & FED ---
  {
    event: "1970s Great Inflation",
    date: "1973-01-01",
    type: "Inflation",
    description: "Oil shock + loose monetary policy caused stagflation.",
    market_impact: -40.0, // Real terms
    sectors_affected: ["Energy (+)", "Gold (+)", "Equities (-)"],
    recovery_pattern: "Lost decade for stocks. Commodities were the only hedge.",
    keywords: ["inflation", "stagflation", "cpi", "oil", "fed"]
  },
  {
    event: "2022 Fed Hiking Cycle",
    date: "2022-03-17",
    type: "Monetary Policy",
    description: "Aggressive rate hikes to combat post-COVID inflation.",
    market_impact: -25.0, // Nasdaq
    sectors_affected: ["Tech (-)", "Growth (-)", "Energy (+)"],
    recovery_pattern: "Valuation reset. Profitable companies recovered first.",
    keywords: ["rates", "hike", "powell", "inflation", "yield"]
  }
];

async function seedHistory() {
  console.log('🌱 Seeding Historical Knowledge Base...');
  
  try {
    // Ensure table exists with vector-ready structure
    await pool.query(`
      CREATE TABLE IF NOT EXISTS historical_events (
        id SERIAL PRIMARY KEY,
        event_date DATE,
        event_type VARCHAR(50),
        description TEXT,
        market_impact DECIMAL,
        duration_days INTEGER DEFAULT 0,
        affected_sectors JSONB,
        recovery_pattern TEXT,
        keywords TEXT[],
        collected_at TIMESTAMP DEFAULT NOW()
      );
    `);

    let count = 0;
    for (const item of HISTORY_DATA) {
      // Check if exists to avoid dupes
      const exists = await pool.query("SELECT id FROM historical_events WHERE description = $1", [item.description]);
      
      if (exists.rows.length === 0) {
        await pool.query(`
          INSERT INTO historical_events
          (event_date, event_type, description, market_impact, affected_sectors, recovery_pattern, keywords)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          item.date,
          item.type,
          item.description,
          item.market_impact,
          JSON.stringify(item.sectors_affected),
          item.recovery_pattern,
          item.keywords
        ]);
        count++;
      }
    }
    
    console.log(`✅ Successfully injected ${count} historical events.`);
    console.log('   The AI can now reference these for comparison.');
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedHistory();
