const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const REPORT_PATH = path.join(ROOT, "docs", "S1_SOURCE_WIRING_AUDIT.md");

function log(msg) {
  process.stdout.write(msg + "\n");
}

function walkTsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (["node_modules", "dist", ".git"].includes(e.name)) continue;
      walkTsFiles(full, out);
    } else if (e.isFile() && e.name.endsWith(".ts") && !e.name.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

// Heuristic source tags
const SOURCE_TAGS = [
  {
    id: "fmp_stable",
    label: "FMP Stable",
    patterns: ["financialmodelingprep.com/stable", "/stable/", "fmpStableWrapper"]
  },
  {
    id: "reddit",
    label: "Reddit",
    patterns: ["reddit.com", "r/stocks", "RedditCollector"]
  },
  {
    id: "marketwatch",
    label: "MarketWatch",
    patterns: ["marketwatch.com", "MarketWatch"]
  },
  {
    id: "yahoo_finance",
    label: "Yahoo Finance",
    patterns: ["feeds.finance.yahoo.com", "query1.finance.yahoo.com", "YahooFinance"]
  },
  {
    id: "white_house",
    label: "White House",
    patterns: ["whitehouse.gov", "WhiteHouse"]
  },
  {
    id: "house_trades",
    label: "House / Senate Trades",
    patterns: ["house-trades", "senate-trades", "congress-trades", "HouseTradesCollector"]
  },
  {
    id: "crypto",
    label: "Crypto (Prices / On-chain)",
    patterns: ["cryptoCollector", "cryptoIntelligenceService", "stable/crypto/price", "stable/crypto/profile"]
  },
  {
    id: "whale",
    label: "Whale / Large-Holder",
    patterns: ["whaleCollector", "whale", "whale_alert", "whalestats"]
  },
  {
    id: "google_trends",
    label: "Google Trends",
    patterns: ["trends.google.com", "GoogleTrends"]
  },
  {
    id: "sec_filings",
    label: "SEC / EDGAR",
    patterns: ["sec.gov", "edgar", "secFilingsCollector"]
  },
  {
    id: "macro_fed",
    label: "Macro / Fed / Rates",
    patterns: ["fredapi", "FRED", "treasury.gov", "stable/economic", "FedRatesCollector"]
  },
  {
    id: "options",
    label: "Options Flow",
    patterns: ["optionsCollect", "unusualOptions", "stable/options-chain", "stable/options"]
  },
  {
    id: "historical_crisis",
    label: "Historical Crisis / Shock Data",
    patterns: ["crisis_history", "shock_config", "regime_config", "seed_crisis_history"]
  }
];

// classify file by path / name
function classifyFile(relPath, content) {
  const cls = new Set();

  if (relPath.includes("/routes/")) cls.add("route");
  if (relPath.includes("/controllers/")) cls.add("controller");
  if (relPath.includes("/services/collectors/") || relPath.toLowerCase().includes("collector")) cls.add("collector");
  if (relPath.includes("/services/")) {
    const base = path.basename(relPath);
    if (/engine/i.test(base)) cls.add("engine");
    if (/service/i.test(base)) cls.add("service");
  }
  if (relPath.includes("/config/")) cls.add("config");
  if (relPath.includes("/scripts/")) cls.add("script");

  // meta-learning engines we just resurrected
  if (relPath.includes("/services/metaLearning/")) cls.add("engine");

  // Catalyst / OmniVector related
  if (/catalyst/i.test(relPath) || /catalyst/i.test(content)) cls.add("catalyst");
  if (/omnivector/i.test(relPath) || /omni[-_ ]?vector/i.test(content)) cls.add("omnivector");

  return Array.from(cls);
}

// parse imports -> simple regex
function extractImports(relPath, content) {
  const imports = [];
  const importRegex = /import\s+[^'"]*\s+from\s+['"]([^'"]+)['"]/g;
  let m;
  const dir = path.dirname(path.join(ROOT, relPath));
  while ((m = importRegex.exec(content)) !== null) {
    const spec = m[1];
    if (!spec.startsWith(".")) continue; // ignore package imports
    let target = spec;
    // resolve to TS path if possible
    let resolved = path.resolve(dir, spec);
    // try .ts
    if (fs.existsSync(resolved + ".ts")) resolved = resolved + ".ts";
    else if (fs.existsSync(resolved + ".js")) resolved = resolved + ".js";
    else if (fs.existsSync(resolved)) {
      // directory index? ignore to keep it simple
    }
    imports.push(rel(path.resolve(resolved)));
  }
  return imports;
}

function buildFileGraph() {
  log("➡ Building file graph from src/ ...");
  const files = walkTsFiles(SRC_DIR);
  const graph = {};       // file -> { imports:[], tags:Set, sources:Set, content }
  const reverse = {};     // file -> Set(importers)

  for (const full of files) {
    const relPath = rel(full);
    const content = fs.readFileSync(full, "utf8");

    const imports = extractImports(relPath, content);
    const tags = classifyFile(relPath, content);
    const sources = new Set();

    for (const src of SOURCE_TAGS) {
      if (src.patterns.some(p => content.includes(p))) {
        sources.add(src.id);
      }
    }

    graph[relPath] = { imports, tags, sources, content };

    for (const imp of imports) {
      if (!reverse[imp]) reverse[imp] = new Set();
      reverse[imp].add(relPath);
    }
    if (!reverse[relPath]) reverse[relPath] = new Set();
  }

  return { graph, reverse };
}

// BFS upwards: from a starting file, see if any route/engine/etc imports it
function traceUpwards(startFile, reverse, graph, limitDepth = 8) {
  const visited = new Set();
  const queue = [{ file: startFile, depth: 0 }];
  const hits = { routes: new Set(), engines: new Set(), catalysts: new Set(), omnivector: new Set() };

  while (queue.length) {
    const { file, depth } = queue.shift();
    if (visited.has(file) || depth > limitDepth) continue;
    visited.add(file);

    const meta = graph[file];
    if (meta) {
      if (meta.tags.includes("route")) hits.routes.add(file);
      if (meta.tags.includes("engine")) hits.engines.add(file);
      if (meta.tags.includes("catalyst")) hits.catalysts.add(file);
      if (meta.tags.includes("omnivector")) hits.omnivector.add(file);
    }

    const parents = reverse[file] || new Set();
    for (const p of parents) {
      if (!visited.has(p)) {
        queue.push({ file: p, depth: depth + 1 });
      }
    }
  }

  return hits;
}

function runAudit() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error("❌ src/ directory not found at:", SRC_DIR);
    process.exit(1);
  }

  const { graph, reverse } = buildFileGraph();

  // Build per-source registry
  const sourceRegistry = {};
  SOURCE_TAGS.forEach(s => {
    sourceRegistry[s.id] = {
      meta: s,
      files: [],          // all files touching this source
      collectors: [],
      services: [],
      engines: [],
      routes: [],
      scripts: [],
      configs: [],
      orphanCollectors: [],
      orphanEngines: [],
      noRouteFiles: [],
      noEngineFiles: []
    };
  });

  for (const [file, meta] of Object.entries(graph)) {
    if (!meta.sources.size) continue;
    for (const srcId of meta.sources) {
      const bucket = sourceRegistry[srcId];
      if (!bucket) continue;
      bucket.files.push(file);

      if (meta.tags.includes("collector")) bucket.collectors.push(file);
      if (meta.tags.includes("service")) bucket.services.push(file);
      if (meta.tags.includes("engine")) bucket.engines.push(file);
      if (meta.tags.includes("route")) bucket.routes.push(file);
      if (meta.tags.includes("script")) bucket.scripts.push(file);
      if (meta.tags.includes("config")) bucket.configs.push(file);
    }
  }

  // wiring analysis per source
  for (const [srcId, bucket] of Object.entries(sourceRegistry)) {
    for (const file of bucket.files) {
      const hits = traceUpwards(file, reverse, graph);

      const hasRoute = hits.routes.size > 0;
      const hasEngine = hits.engines.size > 0 || graph[file].tags.includes("engine");

      if (!hasRoute) bucket.noRouteFiles.push(file);
      if (!hasEngine) bucket.noEngineFiles.push(file);
    }

    // "orphan" collectors/engines = those that never reach a route/engine respectively
    for (const coll of bucket.collectors) {
      const hits = traceUpwards(coll, reverse, graph);
      if (hits.engines.size === 0 && hits.routes.size === 0) {
        bucket.orphanCollectors.push(coll);
      }
    }
    for (const eng of bucket.engines) {
      const hits = traceUpwards(eng, reverse, graph);
      if (hits.routes.size === 0) {
        bucket.orphanEngines.push(eng);
      }
    }
  }

  // also: configs that are never imported at all — "orphan configs"
  const orphanConfigs = [];
  for (const [file, meta] of Object.entries(graph)) {
    if (!meta.tags.includes("config")) continue;
    const parents = reverse[file] || new Set();
    if (parents.size === 0) orphanConfigs.push(file);
  }

  // ------------------------------------------------------
  // Write Markdown report
  // ------------------------------------------------------
  let out = "";
  out += "# S1 Source Wiring Audit\n\n";
  out += "Generated at: `" + new Date().toISOString() + "`\n\n";
  out += "Mode: **SAFE** (read-only on TS/JS; only this report + helper script created).\n\n";
  out += "This report maps external data **sources** → **collectors/services** → **engines** → **routes/UI**, and flags:\n";
  out += "- Sources that are **collected but never reach an engine**\n";
  out += "- Engines that **never reach a route/UI**\n";
  out += "- Config files that are **never imported** (orphan configs)\n\n";
  out += "---\n\n";

  for (const src of SOURCE_TAGS) {
    const bucket = sourceRegistry[src.id];
    const total = bucket.files.length;

    if (total === 0) continue; // skip completely unused tags

    out += `## Source: ${src.label} \`(${src.id})\`\n\n`;
    out += `**Heuristic patterns:** \`${src.patterns.join("`, `")}\`\n\n`;
    out += `**Files touching this source:** ${total}\n\n`;

    const summariseList = (label, arr) => {
      out += `- **${label}**: ${arr.length}\n`;
      if (arr.length) {
        out += "  - " + arr.slice(0, 10).map(f => "`" + f + "`").join(", ") + (arr.length > 10 ? ", ..." : "") + "\n";
      }
    };

    summariseList("Collectors", bucket.collectors);
    summariseList("Services", bucket.services);
    summariseList("Engines", bucket.engines);
    summariseList("Routes", bucket.routes);
    summariseList("Scripts", bucket.scripts);
    summariseList("Configs", bucket.configs);

    // wiring flags
    out += "\n### Wiring Health\n\n";

    const uniqueNoRoute = Array.from(new Set(bucket.noRouteFiles));
    const uniqueNoEngine = Array.from(new Set(bucket.noEngineFiles));

    out += `- Files that **never reach a route/UI** (via imports): ${uniqueNoRoute.length}\n`;
    if (uniqueNoRoute.length) {
      out += "  - " + uniqueNoRoute.slice(0, 10).map(f => "`" + f + "`").join(", ") + (uniqueNoRoute.length > 10 ? ", ..." : "") + "\n";
    }

    out += `- Files that **never reach an engine** (via imports): ${uniqueNoEngine.length}\n`;
    if (uniqueNoEngine.length) {
      out += "  - " + uniqueNoEngine.slice(0, 10).map(f => "`" + f + "`").join(", ") + (uniqueNoEngine.length > 10 ? ", ..." : "") + "\n";
    }

    if (bucket.orphanCollectors.length || bucket.orphanEngines.length) {
      out += "\n### Potential Orphans\n\n";
      if (bucket.orphanCollectors.length) {
        out += `- **Orphan collectors** (no engine, no route): ${bucket.orphanCollectors.length}\n`;
        out += "  - " + bucket.orphanCollectors.map(f => "`" + f + "`").join(", ") + "\n";
      }
      if (bucket.orphanEngines.length) {
        out += `- **Engines not wired to any route/UI**: ${bucket.orphanEngines.length}\n`;
        out += "  - " + bucket.orphanEngines.map(f => "`" + f + "`").join(", ") + "\n";
      }
    }

    out += "\n---\n\n";
  }

  // Orphan configs section
  out += "## Global Orphan Configs\n\n";
  out += "Config files in `src/config` that are never imported by any TS file.\n\n";
  out += `Count: ${orphanConfigs.length}\n\n`;
  if (orphanConfigs.length) {
    for (const f of orphanConfigs) {
      out += "- `" + f + "`\n";
    }
  }

  fs.writeFileSync(REPORT_PATH, out, "utf8");
  log("✅ S1 audit report written to: " + REPORT_PATH);
}

try {
  runAudit();
} catch (err) {
  console.error("❌ S1 audit failed:", err);
  process.exit(1);
}
