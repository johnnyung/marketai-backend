import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

router.get("/crash-scan", (req, res) => {
  const routesDir = path.join(__dirname, "./");

  const results: any[] = [];

  fs.readdirSync(routesDir).forEach(file => {
    if (!file.endsWith(".js")) return;
    const full = path.join(routesDir, file);

    try {
      // Try requiring the route file
      require(full);
      results.push({ file, status: "OK" });
    } catch (err: any) {
      results.push({
        file,
        status: "CRASH",
        error: err.message || String(err)
      });
    }
  });

  res.json({ results });
});

export default router;
