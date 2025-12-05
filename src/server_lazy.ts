import dotenv from "dotenv";
dotenv.config(); // MUST LOAD FIRST

import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

async function loadRoutes() {
  // Dynamic imports so db/index loads AFTER dotenv

  const routeList = [
    ["./routes/ai-tips.js", "/api/ai-tips"],
    ["./routes/ai.js", "/api/ai"],
    ["./routes/auth.js", "/api/auth"],
    // Fallback: auto-import everything under routes/
  ];

  for (const [file, mount] of routeList) {
    try {
      const module = await import(file);
      app.use(mount, module.default || module);
      console.log(`⚡ Loaded route: ${mount}`);
    } catch (err) {
      console.error(`❌ Failed loading route ${file}`, err);
    }
  }

  // Load all remaining route files (except duplicates)
  const glob = await import("glob");
  const routes = glob.globSync("./dist/routes/*.js");

  for (const r of routes) {
    if (routeList.some(x => r.endsWith(x[0].replace('./routes/', '')))) continue;

    const mount = "/api/" + r.split("/").pop().replace(".js", "");
    try {
      const mod = await import(r);
      app.use(mount, mod.default || mod);
      console.log(`⚡ Auto-mounted route: ${mount}`);
    } catch (e) {
      console.warn(`⚠️ Skipped route ${r}`);
    }
  }
}

loadRoutes().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 MarketAI running on port ${PORT}`);
  });
});
