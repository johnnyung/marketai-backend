import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db/index.js";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

router.get("/me", async (req: Request, res: Response) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Missing token" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const result = await pool.query(
      "SELECT id, email, username, role, is_verified, created_at, updated_at FROM users WHERE id = $1",
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    return res.status(401).json({ success: false, error: "Invalid token" });
  }
});

// Register
router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res
      .status(400)
      .json({ success: false, error: "Email and password required" });

  const existing = await pool.query("SELECT id FROM users WHERE email=$1", [
    email,
  ]);

  if (existing.rows.length > 0)
    return res
      .status(409)
      .json({ success: false, error: "Email already registered" });

  const hash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `
      INSERT INTO users (email, password_hash, role)
      VALUES ($1, $2, 'user')
      RETURNING id, email, role, is_verified
    `,
    [email, hash]
  );

  res.json({ success: true, user: result.rows[0] });
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query("SELECT * FROM users WHERE email=$1", [
    email,
  ]);

  if (result.rows.length === 0)
    return res.status(401).json({ success: false, error: "Invalid credentials" });

  const user = result.rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);

  if (!ok)
    return res.status(401).json({ success: false, error: "Invalid credentials" });

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  const { password_hash, ...safeUser } = user;

  res.json({ success: true, token, user: safeUser });
});

export default router;
