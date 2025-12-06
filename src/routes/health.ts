import { Router } from "express";

const router = Router();

/**
 * GET /api/health
 * Basic system health check
 */
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "marketai-backend",
    timestamp: new Date().toISOString()
  });
});

export default router;
