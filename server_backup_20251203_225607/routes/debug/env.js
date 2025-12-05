import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    node_env: process.env.NODE_ENV,
    fmp_key_present: !!process.env.FMP_API_KEY,
    env_loaded: true,
  });
});

export default router;
