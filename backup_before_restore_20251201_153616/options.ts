import express from "express";
import optionsRadar from "../services/optionsRadarService.js";

const router = express.Router();

router.get("/unusual/:ticker", async (req, res) => {
  try {
    const ticker = req.params.ticker;
    const flow = await optionsRadar.processFlow(ticker);

      prompt: `Summarize unusual options activity for ${ticker}. Data:\n${JSON.stringify(flow)}\nProvide an explanation of potential risk and catalysts.`,
      type: "OPTIONS_FLOW"
    });

    res.json({ ticker, analysis: text, raw: flow });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
