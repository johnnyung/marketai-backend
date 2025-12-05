import express from "express";
import unusualOptionsEngine from "../services/unusualOptionsEngine.js";

const router = express.Router();

router.get("/unusual/:ticker", async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const result = await unusualOptionsEngine.analyze(ticker);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
