import express from "express";
import { llmChat, llmStatus } from "../services/llm/llmRouter.js";

const router = express.Router();

router.get("/status", (req, res) => {
  res.json(llmStatus());
});

router.post("/chat", async (req, res) => {
  try {
    const { prompt } = req.body;
    const reply = await llmChat(prompt);
    res.json({ ok: true, reply });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
