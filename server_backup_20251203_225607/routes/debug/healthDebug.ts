import express from "express";
import fmpService from "../../services/fmpService.js";
import tickerUniverseService from "../../services/tickerUniverseService.js";

const router = express.Router();

router.get("/health", async (_req, res) => {
  const report = {
    fmp_key_present: !!process.env.FMP_API_KEY,
    fmp_quote: await fmpService.getPrice("AAPL"),
    universe_count: (await tickerUniverseService.getUniverse()).length,
    timestamp: Date.now()
  };
  res.json(report);
});

export default router;
