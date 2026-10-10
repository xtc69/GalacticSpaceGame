import { Router } from "express";
import bcrypt from "bcryptjs";
import { createPlayer, findPlayerByUsername } from "../store.js";
import { signToken } from "../auth.js";

const router = Router();

router.post("/register", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: "Username and password (6+ chars) are required" });
  }
  try {
    const player = createPlayer(username, password);
    res.status(201).json({ token: signToken(player) });
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});

router.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  const player = findPlayerByUsername(username || "");
  if (!player || !bcrypt.compareSync(password || "", player.passwordHash)) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  res.json({ token: signToken(player) });
});

export default router;
