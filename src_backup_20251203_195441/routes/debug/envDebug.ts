import express from "express";

const router = express.Router();

router.get("/env", (req, res) => {
  res.json({
    FMP_API_KEY: process.env.FMP_API_KEY ? "SET" : "MISSING",
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
  });
});

export default router;
