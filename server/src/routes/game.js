import { Router } from "express";
import { authMiddleware } from "../auth.js";
import { players, fleets, combatLogs, market } from "../store.js";

const router = Router();
router.use(authMiddleware);

router.get("/me", (req, res) => {
  const player = players.get(req.user.sub);
  if (!player) return res.status(404).json({ error: "Player not found" });
  const { passwordHash, ...safePlayer } = player;
  res.json(safePlayer);
});

router.get("/fleet", (req, res) => {
  res.json(fleets.get(req.user.sub) || []);
});

router.get("/combat-log", (req, res) => {
  res.json(combatLogs.get(req.user.sub) || []);
});

router.get("/economy", (_req, res) => {
  res.json(market);
});

export default router;
