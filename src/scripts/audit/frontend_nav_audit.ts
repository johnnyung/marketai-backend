import fetch from "node-fetch";

const FRONTEND_URL = process.env.MARKETAI_FRONTEND_URL || "https://stocks.jeeniemedia.com";

const PAGES = [
  { path: "/",          name: "Landing / Command Center", markers: ["Command Center", "Source Status", "Market Overview"] },
  { path: "/command-center", name: "Command Center",      markers: ["Command Center", "Source Status"] },
  { path: "/ai-tips",   name: "AI Tips",                  markers: ["AI Tips", "AI Stock Ideas", "Safe / Growth / Crypto"] },
  { path: "/correlation", name: "Correlation Lab",        markers: ["Correlation", "Correlation Lab"] },
  { path: "/my-portfolio", name: "My Portfolio",          markers: ["My Portfolio", "Holdings"] },
  { path: "/diagnostics",  name: "Diagnostics",           markers: ["Diagnostics", "System Health"] }
];

async function main() {
  console.log(`🧪 FRONTEND UI / NAV AUDIT: BASE=${FRONTEND_URL}`);
  let hardFailures = 0;

  for (const page of PAGES) {
    const url = `${FRONTEND_URL}${page.path}`;
    console.log(`  🌐 Checking page: ${page.name} (${url})`);

    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.log(`    ❌ HTTP Error ${res.status} on ${page.name}`);
        hardFailures++;
        continue;
      }
      const text = await res.text();
      let found = false;
      for (const marker of page.markers) {
        if (text.includes(marker)) {
          console.log(`    ✅ Marker found: "${marker}"`);
          found = true;
          break;
        }
      }
      if (!found) {
        console.log(`    ⚠️  No expected text markers found on ${page.name}`);
      }
    } catch (err: any) {
      console.log(`    ❌ Fetch failed for ${page.name}: ${err.message}`);
      hardFailures++;
    }
  }

  if (hardFailures > 0) {
    console.log(`❌ Frontend Audit: ${hardFailures} page(s) unreachable or error.`);
    process.exit(1);
  } else {
    console.log("✅ Frontend UI / Navigation Audit Completed.");
    process.exit(0);
  }
}

main();
