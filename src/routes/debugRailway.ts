import express from "express";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const router = express.Router();

router.get("/commit", (_req, res) => {
  try {
    const hash = execSync("git rev-parse HEAD").toString().trim();
    res.json({ commit: hash });
  } catch (err) {
    res.json({ commit: "UNKNOWN", error: String(err) });
  }
});

router.get("/entrypoint", (_req, res) => {
  res.json({
    entrypoint: process.argv[1],
    cwd: process.cwd(),
    execPath: process.execPath
  });
});

router.get("/routes", (req, res) => {
  const app = req.app;
  const routes: any[] = [];

  app._router.stack.forEach((layer: any) => {
    if (layer.route) {
      routes.push({
        path: layer.route.path,
        methods: layer.route.methods
      });
    }
  });

  res.json({ routes });
});

router.get("/ls", (_req, res) => {
  try {
    const root = process.cwd();
    const entries = fs.readdirSync(root);
    res.json({ root, entries });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/file/*", (req, res) => {
  try {
    const relative = req.params[0];
    const absPath = path.join(process.cwd(), relative);

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: "File not found", path: absPath });
    }

    const content = fs.readFileSync(absPath, "utf8");
    res.type("text/plain").send(content);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
