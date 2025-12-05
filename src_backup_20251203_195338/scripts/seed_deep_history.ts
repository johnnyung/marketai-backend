import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const HISTORY_DB = [
  // POLITICAL SCANDALS
  {
    event: "Clinton-Lewinsky Scandal",
    date: "1998-01-21",
    type: "Political Scandal",
    description: "Presidential impeachment proceedings regarding Monica Lewinsky.",
    market_impact: -19.3,
    duration_days: 120,
    affected_sectors: ["General Market", "Tech (Safe Haven)"],
    recovery_pattern: "Initial volatility and 19% drop, followed by massive 28% rally into 1999 as earnings remained strong.",
    keywords: ["impeachment", "clinton", "scandal", "president", "investigation"]
  },
  {
    event: "Nixon Watergate Resignation",
    date: "1974-08-09",
    type: "Political Scandal",
    description: "President Nixon resigns following Watergate investigation.",
    market_impact: -40.0,
    duration_days: 300,
    affected_sectors: ["All Sectors"],
    recovery_pattern: "Prolonged bear market due to coincident inflation shock. Uncertainty killed valuation.",
    keywords: ["resignation", "watergate", "nixon", "corruption"]
  },
  {
    event: "Trump Trade War",
    date: "2018-03-22",
    type: "Geopolitical Policy",
    description: "US imposes tariffs on $60B of Chinese imports.",
    market_impact: -10.2,
    duration_days: 90,
    affected_sectors: ["Manufacturing", "Tech", "Agriculture"],
    recovery_pattern: "Choppy trading range. Domestic small-caps (IWM) outperformed multinationals.",
    keywords: ["tariff", "trade", "china", "trump", "protectionism"]
  },
  
  // MARKET CRASHES
  {
    event: "2008 Financial Crisis",
    date: "2008-09-15",
    type: "Systemic Crash",
    description: "Lehman Brothers bankruptcy triggers global liquidity freeze.",
    market_impact: -56.8,
    duration_days: 517,
    affected_sectors: ["Financials", "Real Estate"],
    recovery_pattern: "Gold and Dollar rallied. Equities crashed until QE intervention in 2009.",
    keywords: ["bank", "collapse", "recession", "bailout", "housing"]
  },
  {
    event: "Dot-Com Bubble Burst",
    date: "2000-03-10",
    type: "Asset Bubble",
    description: "Overvaluation of internet stocks corrects violently.",
    market_impact: -78.0,
    duration_days: 900,
    affected_sectors: ["Technology", "Internet"],
    recovery_pattern: "Old economy (Value/Energy) outperformed while Tech crashed for 2 years.",
    keywords: ["tech", "bubble", "overvaluation", "nasdaq", "growth"]
  },

  // WARS & SHOCKS
  {
    event: "Russia-Ukraine Invasion",
    date: "2022-02-24",
    type: "War",
    description: "Major land war in Europe involving energy super-producer.",
    market_impact: -12.0,
    duration_days: 60,
    affected_sectors: ["Energy", "Defense", "Agriculture"],
    recovery_pattern: "Oil/Gas and Defense stocks rallied hard. Tech sold off on inflation fears.",
    keywords: ["war", "invasion", "russia", "oil", "energy", "defense"]
  },
  {
    event: "COVID-19 Pandemic",
    date: "2020-03-11",
    type: "Black Swan",
    description: "Global economic shutdown due to virus.",
    market_impact: -34.0,
    duration_days: 33,
    affected_sectors: ["Travel", "Hospitality", "Energy"],
    recovery_pattern: "Fastest bear market ever, followed by massive 'Work From Home' tech rally.",
    keywords: ["virus", "pandemic", "lockdown", "stimulus"]
  }
];

async function seed() {
  console.log('🌱 Seeding Historical Knowledge Base...');
  
  // Ensure table exists
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
  for (const item of HISTORY_DB) {
    // Upsert to avoid duplicates
    const res = await pool.query("SELECT id FROM historical_events WHERE event = $1", [item.event]);
    if (res.rows.length === 0) {
        await pool.query(`
          INSERT INTO historical_events
          (event, event_date, event_type, description, market_impact, duration_days, affected_sectors, recovery_pattern, keywords)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          item.event, item.date, item.type, item.description,
          item.market_impact, item.duration_days,
          JSON.stringify(item.affected_sectors), item.recovery_pattern, item.keywords
        ]);
        count++;
    }
  }
  
  console.log(`✅ Injected ${count} historical events.`);
  process.exit(0);
}

seed();
