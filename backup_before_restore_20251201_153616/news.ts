import express from "express";
import { newsService } from "../services/news.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ route: "news", status: "ok" });
});

router.get("/company/:ticker", async (req, res) => {
  try {
    const ticker = req.params.ticker;
    const news = await newsService.getCompanyNews(ticker);

      prompt: `Summarize these news headlines for ${ticker}:\n\n${JSON.stringify(news)}\n\nProvide a concise 5-bullet summary.`,
      type: "NEWS_SUMMARY"
    });

    res.json({ ticker, summary, raw: news });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
