import { Router, Request, Response } from "express";

const router = Router();

const healthHandler = (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "marketai-backend",
    mode: process.env.NODE_ENV || "unknown",
    timestamp: new Date().toISOString(),
  });
};

// ✅ Primary endpoint: /api/health
router.get("/", healthHandler);

// ✅ Extra alias: /api/health/health (just in case anything calls it)
router.get("/health", healthHandler);

export default router;
