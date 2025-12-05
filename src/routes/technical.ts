import express from "express";
import technicalAnalysis from "../services/technicalAnalysis.js";

const router = express.Router();

router.get("/:ticker", async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const result = await technicalAnalysis.calculateIndicators(ticker);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
