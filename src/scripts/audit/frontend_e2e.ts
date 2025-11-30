import 'dotenv/config';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://stocks.jeeniemedia.com';

type PageCheck = {
  path: string;
  name: string;
  mustContain: string[];
};

const pages: PageCheck[] = [
  { path: '/',              name: 'Landing / Command Center', mustContain: ['Command Center', 'AI Tips'] },
  { path: '/command-center',name: 'Command Center',           mustContain: ['Command Center'] },
  { path: '/ai-tips',       name: 'AI Tips',                  mustContain: ['AI Tips'] },
  { path: '/correlation',   name: 'Correlation Lab',          mustContain: ['Correlation'] },
  { path: '/my-portfolio',  name: 'My Portfolio',             mustContain: ['My Portfolio'] },
  { path: '/diagnostics',   name: 'Diagnostics',              mustContain: ['Diagnostics'] }
];

async function checkPage(page: PageCheck) {
  const url = FRONTEND_URL.replace(/\/$/, '') + page.path;
  console.log(`  🌐 Checking page: ${page.name} (${url})`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Page ${page.name} returned status ${res.status}`);
  }
  const html = await res.text();

  for (const marker of page.mustContain) {
    if (!html.toLowerCase().includes(marker.toLowerCase())) {
      console.warn(`    ⚠️  Marker not found on ${page.name}: "${marker}"`);
    } else {
      console.log(`    ✅ Marker found: "${marker}"`);
    }
  }
}

async function run() {
  console.log(`🧪 FRONTEND UI / NAV AUDIT: BASE=${FRONTEND_URL}`);
  for (const page of pages) {
    try {
      await checkPage(page);
    } catch (e: any) {
      console.error(`  ❌ Frontend check failed for ${page.name}: ${e.message}`);
      process.exitCode = 1;
    }
  }
  console.log('✅ Frontend UI / Navigation Audit Completed.');
}

run();
