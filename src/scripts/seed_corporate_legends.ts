import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();


// BUSINESS WARS & POLITICAL SHIFTS
const LEGENDS = [
  // --- DISRUPTION & TECH SHIFTS ---
  {
    event: "Google Overtakes Yahoo (Search Wars)",
    date: "2004-08-19", // Google IPO date approx
    type: "Tech Disruption",
    description: "A streamlined, superior product displaces the bloated incumbent portal model.",
    market_impact: 1500.0, // Long term gain
    affected_sectors: ["Internet", "Advertising"],
    recovery_pattern: "The disruptor (Google) captured 90% of value. The incumbent (Yahoo) slowly faded over 15 years.",
    keywords: ["search", "google", "yahoo", "disruption", "adtech", "internet"]
  },
  {
    event: "Facebook Overtakes MySpace",
    date: "2008-04-01",
    type: "Network Effect Flip",
    description: "Real identity verification (Facebook) defeated anonymous/customizable profiles (MySpace).",
    market_impact: 0.0, // Private markets at the time, but massive value shift
    affected_sectors: ["Social Media", "Tech"],
    recovery_pattern: "Winner-take-all dynamics. Once the user base flipped, it never went back.",
    keywords: ["social", "facebook", "myspace", "network effect", "meta"]
  },
  {
    event: "Apple Near-Bankruptcy & Turnaround",
    date: "1997-08-06", // Microsoft investment / Jobs return
    type: "Corporate Turnaround",
    description: "Steve Jobs returns, cuts product lines 70%, focuses on premium branding (iMac/iPod).",
    market_impact: 50000.0, // Historic run
    affected_sectors: ["Consumer Electronics"],
    recovery_pattern: "Consolidation of focus -> New Product Hit (iPod) -> Ecosystem Lock-in.",
    keywords: ["apple", "turnaround", "jobs", "innovation", "product launch"]
  },
  {
    event: "AI Boom vs Dot-Com Bubble",
    date: "2023-01-01",
    type: "Tech Paradigm Shift",
    description: "Comparison of generative AI infrastructure buildout to 1999 telecom/internet buildout.",
    market_impact: 50.0,
    affected_sectors: ["Semiconductors", "Software"],
    recovery_pattern: "Infrastructure providers (Cisco/Nvidia) run first. Application layer winners emerge years later.",
    keywords: ["ai", "dot-com", "bubble", "infrastructure", "nvidia", "cisco"]
  },

  // --- COMPETITION ---
  {
    event: "Uber vs Lyft Price War",
    date: "2014-01-01",
    type: "Market Share War",
    description: "Aggressive subsidies to capture user base in a duopoly.",
    market_impact: -20.0, // Profitability drag
    affected_sectors: ["Gig Economy", "Transportation"],
    recovery_pattern: "Capital destruction until consolidation/truce. First mover (Uber) eventually dominated unit economics.",
    keywords: ["uber", "lyft", "rideshare", "competition", "price war"]
  },

  // --- POLITICAL & POLICY ---
  {
    event: "Reagan Deregulation Era",
    date: "1981-01-20",
    type: "Political Regime Change",
    description: "Shift to supply-side economics, tax cuts, and deregulation.",
    market_impact: 30.0,
    affected_sectors: ["Financials", "Energy", "Defense"],
    recovery_pattern: "Secular bull market in equities. Financial sector boom.",
    keywords: ["reagan", "deregulation", "tax cuts", "cabinet", "conservative"]
  },
  {
    event: "Biden Antitrust Crackdown (Lina Khan)",
    date: "2021-06-15",
    type: "Regulatory Regime",
    description: "Aggressive FTC stance against big tech M&A.",
    market_impact: -10.0, // On M&A targets
    affected_sectors: ["Big Tech", "M&A Arbitrage"],
    recovery_pattern: "Deal spreads widened. Large acquisitions blocked or abandoned (e.g. Nvidia/ARM).",
    keywords: ["antitrust", "ftc", "khan", "merger", "regulation", "breakup"]
  }
];

async function seed() {
  console.log('🌱 Seeding Market Mechanics...');
  
  let count = 0;
  for (const item of LEGENDS) {
    // Upsert to avoid duplicates
    const res = await pool.query("SELECT id FROM historical_events WHERE event = $1", [item.event]);
    if (res.rows.length === 0) {
        await pool.query(`
          INSERT INTO historical_events
          (event, event_date, event_type, description, market_impact, duration_days, affected_sectors, recovery_pattern, keywords, collected_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        `, [
          item.event, item.date, item.type, item.description,
          item.market_impact, 365,
          JSON.stringify(item.affected_sectors), item.recovery_pattern, item.keywords
        ]);
        count++;
    }
  }
  
  console.log(`✅ Injected ${count} Corporate/Political Legends.`);
  process.exit(0);
}

seed();
