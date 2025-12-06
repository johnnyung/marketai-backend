import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();


const HISTORY_DATA = [
  {
    event: "Clinton-Lewinsky Scandal",
    date: "1998-01-21",
    type: "Political Scandal",
    description: "Presidential impeachment proceedings regarding Monica Lewinsky.",
    market_impact: -19.3,
    duration_days: 120,
    affected_sectors: ["General Market", "Tech (Safe Haven)"],
    recovery_pattern: "Initial volatility and 19% drop, followed by massive 28% rally into 1999.",
    keywords: ["impeachment", "clinton", "scandal", "president", "investigation", "legal"]
  },
  {
    event: "Nixon Watergate Resignation",
    date: "1974-08-09",
    type: "Political Scandal",
    description: "President Nixon resigns following Watergate investigation.",
    market_impact: -40.0,
    duration_days: 300,
    affected_sectors: ["All Sectors"],
    recovery_pattern: "Prolonged bear market due to coincident inflation shock.",
    keywords: ["resignation", "watergate", "nixon", "corruption", "president"]
  },
  {
    event: "Trump Trade War",
    date: "2018-03-22",
    type: "Geopolitical Policy",
    description: "US imposes tariffs on Chinese imports.",
    market_impact: -10.2,
    duration_days: 90,
    affected_sectors: ["Manufacturing", "Tech", "Agriculture"],
    recovery_pattern: "Choppy trading range. Domestic small-caps outperformed multinationals.",
    keywords: ["tariff", "trade", "china", "trump", "protectionism", "tax"]
  },
  {
    event: "2008 Financial Crisis",
    date: "2008-09-15",
    type: "Systemic Crash",
    description: "Lehman Brothers bankruptcy triggers global liquidity freeze.",
    market_impact: -56.8,
    duration_days: 517,
    affected_sectors: ["Financials", "Real Estate"],
    recovery_pattern: "Gold and Dollar rallied. Equities crashed until QE.",
    keywords: ["bank", "collapse", "recession", "bailout", "housing", "crisis"]
  },
  {
    event: "COVID-19 Pandemic",
    date: "2020-03-11",
    type: "Black Swan",
    description: "Global economic shutdown due to virus.",
    market_impact: -34.0,
    duration_days: 33,
    affected_sectors: ["Travel", "Hospitality", "Energy"],
    recovery_pattern: "V-shaped recovery led by Tech and Stimulus.",
    keywords: ["virus", "pandemic", "lockdown", "stimulus", "covid"]
  }
];

async function repair() {
  console.log('🛠️  Repairing historical_events table...');
  
  try {
    // 1. DROP the broken table to ensure clean slate
    await pool.query('DROP TABLE IF EXISTS historical_events');
    console.log('   ✓ Dropped old table');

    // 2. CREATE correct table with "event" column
    await pool.query(`
      CREATE TABLE historical_events (
        id SERIAL PRIMARY KEY,
        event TEXT,
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
    console.log('   ✓ Created corrected table');

    // 3. SEED data
    let count = 0;
    for (const item of HISTORY_DATA) {
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
    
    console.log(`✅ Successfully injected ${count} historical events.`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Repair failed:', error);
    process.exit(1);
  }
}

repair();
