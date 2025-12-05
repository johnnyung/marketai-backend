import express from "express";
import envDebug from "./envDebug.js";
import fmpDebug from "./fmpDebug.js";
import universeDebug from "./universeDebug.js";
import healthDebug from "./healthDebug.js";

const router = express.Router();

router.use("/env", envDebug);
router.use("/fmp", fmpDebug);
router.use("/sp500", universeDebug);
router.use("/health", healthDebug);

export default router;
