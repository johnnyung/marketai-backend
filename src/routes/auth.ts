import express from "express";
import { registerUser, loginUser, verifyUser } from "../services/auth.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const user = await registerUser(req.body.email, req.body.username, req.body.password);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const result = await loginUser(req.body.email, req.body.password);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post("/verify/:id", async (req, res) => {
  try {
    const user = await verifyUser(Number(req.params.id));
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
