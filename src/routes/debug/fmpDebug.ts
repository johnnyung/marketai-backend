import express from "express";
import fmpService from "../../services/fmpService.js";

const router = express.Router();

router.get("/fmp/quote/:ticker", async (req, res) => {
  try {
    const result = await fmpService.getPrice(req.params.ticker);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/fmp/test", async (req, res) => {
  const result = await fmpService.getPrice("AAPL");
  res.json(result);
});

export default router;
