import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get("/crash-scan", async (req, res) => {
  try {
    const files = fs.readdirSync(__dirname).filter(f => f.endsWith(".js"));

    res.json({
      status: "ok",
      dirname: __dirname,
      files
    });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

export default router;
