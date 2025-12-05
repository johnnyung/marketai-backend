import express from "express";
import tickerUniverseService from "../../services/tickerUniverseService.js";

const router = express.Router();

router.get("/universe", async (_req, res) => {
  const universe = await tickerUniverseService.getUniverse();
  res.json({ count: universe.length, tickers: universe });
});

export default router;
