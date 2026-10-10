import express from "express";
import { executeQuery } from "../db.js";
import { sendReportEmail, sendAllPlayersWeeklyReports, sendBatchReports } from "../services/reportService.js";

const router = express.Router();

// Middleware to check authentication (if needed)
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });
  next();
}

// GET /api/reports/stats - Get available stats types
router.get("/stats", async (req, res) => {
  try {
    res.json({
      availableStats: [
        { name: "player_stats", description: "General player information and levels" },
        { name: "combat_stats", description: "Combat history and win/loss records" },
        { name: "economy_stats", description: "Resource and credit transactions" },
        { name: "fleet_stats", description: "Fleet composition and status" },
        { name: "comprehensive", description: "All available stats combined" },
      ],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/player/:playerId/stats/:statType - Get specific player stats
router.get("/player/:playerId/stats/:statType", async (req, res) => {
  try {
    const { playerId, statType } = req.params;
    let stats = {};

    switch (statType) {
      case "player_stats":
        const playerData = await executeQuery("SELECT * FROM players WHERE id = ?", [playerId]);
        if (playerData.length) {
          stats = playerData[0];
        }
        break;

      case "combat_stats":
        const combatData = await executeQuery(
          `SELECT * FROM combat_logs 
           WHERE player_id = ? AND event_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
           ORDER BY event_date DESC`,
          [playerId]
        );
        stats = {
          totalBattles: combatData.length,
          victories: combatData.filter(c => c.outcome === "victory").length,
          defeats: combatData.filter(c => c.outcome === "defeat").length,
          totalDamageDealt: combatData.reduce((sum, c) => sum + (c.damage_dealt || 0), 0),
          totalDamageTaken: combatData.reduce((sum, c) => sum + (c.damage_taken || 0), 0),
          recentBattles: combatData.slice(0, 10),
        };
        break;

      case "economy_stats":
        const economyData = await executeQuery(
          `SELECT * FROM economy_events 
           WHERE player_id = ? AND event_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
           ORDER BY event_date DESC`,
          [playerId]
        );
        stats = {
          totalTransactions: economyData.length,
          totalIncome: economyData
            .filter(e => e.event_type === "income")
            .reduce((sum, e) => sum + (e.amount || 0), 0),
          totalExpenses: economyData
            .filter(e => e.event_type === "expense")
            .reduce((sum, e) => sum + (e.amount || 0), 0),
          recentEvents: economyData.slice(0, 15),
        };
        break;

      case "fleet_stats":
        // This would depend on your fleet table structure
        stats = {
          message: "Fleet stats endpoint - integrate with your fleet data",
          placeholder: true,
        };
        break;

      case "comprehensive":
        const [playerComp, combatComp, economyComp] = await Promise.all([
          executeQuery("SELECT * FROM players WHERE id = ?", [playerId]),
          executeQuery(
            `SELECT * FROM combat_logs 
             WHERE player_id = ? AND event_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             ORDER BY event_date DESC`,
            [playerId]
          ),
          executeQuery(
            `SELECT * FROM economy_events 
             WHERE player_id = ? AND event_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             ORDER BY event_date DESC`,
            [playerId]
          ),
        ]);

        stats = {
          playerInfo: playerComp[0] || null,
          combatStats: {
            totalBattles: combatComp.length,
            victories: combatComp.filter(c => c.outcome === "victory").length,
            defeats: combatComp.filter(c => c.outcome === "defeat").length,
            winRate: combatComp.length ? ((combatComp.filter(c => c.outcome === "victory").length / combatComp.length) * 100).toFixed(2) : 0,
            totalDamageDealt: combatComp.reduce((sum, c) => sum + (c.damage_dealt || 0), 0),
            totalDamageTaken: combatComp.reduce((sum, c) => sum + (c.damage_taken || 0), 0),
          },
          economyStats: {
            totalTransactions: economyComp.length,
            totalIncome: economyComp
              .filter(e => e.event_type === "income")
              .reduce((sum, e) => sum + (e.amount || 0), 0),
            totalExpenses: economyComp
              .filter(e => e.event_type === "expense")
              .reduce((sum, e) => sum + (e.amount || 0), 0),
          },
        };
        break;

      default:
        return res.status(400).json({ error: "Invalid stat type" });
    }

    res.json({ playerId, statType, stats, timestamp: new Date() });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/reports/generate - Generate report on-demand
router.post("/generate", async (req, res) => {
  try {
    const { playerId, email } = req.body;

    if (!playerId) {
      return res.status(400).json({ error: "playerId is required" });
    }

    // Send email report
    const result = await sendReportEmail(playerId, email);
    res.json({
      success: true,
      message: "Report generated and sent successfully",
      messageId: result.messageId,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/reports/generate-batch - Generate reports for multiple players
router.post("/generate-batch", async (req, res) => {
  try {
    const { playerIds } = req.body;

    if (!Array.isArray(playerIds) || playerIds.length === 0) {
      return res.status(400).json({ error: "playerIds array is required" });
    }

    const results = await sendBatchReports(playerIds);
    res.json({
      success: true,
      message: `Reports processed. Sent: ${results.sent.length}, Failed: ${results.failed.length}`,
      details: results,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error generating batch reports:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/reports/send-all-weekly - Send weekly reports to all players (admin only)
router.post("/send-all-weekly", async (req, res) => {
  try {
    // In production, add proper authentication check here
    const results = await sendAllPlayersWeeklyReports();
    res.json({
      success: true,
      message: "Weekly reports sent to all players",
      results,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error sending weekly reports:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/schedule - View scheduled reports
router.get("/schedule", async (req, res) => {
  try {
    const reports = await executeQuery(
      "SELECT * FROM reports ORDER BY created_at DESC LIMIT 50"
    );
    res.json({
      reports,
      schedule: {
        frequency: "Weekly",
        dayOfWeek: "Monday",
        time: "00:00 UTC",
      },
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/history/:playerId - Get report history for a player
router.get("/history/:playerId", async (req, res) => {
  try {
    const { playerId } = req.params;
    const reports = await executeQuery(
      "SELECT * FROM reports WHERE player_id = ? ORDER BY created_at DESC LIMIT 20",
      [playerId]
    );
    res.json({ playerId, reports, timestamp: new Date() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/status/:reportId - Get status of a specific report
router.get("/status/:reportId", async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = await executeQuery("SELECT * FROM reports WHERE id = ?", [reportId]);

    if (!report || report.length === 0) {
      return res.status(404).json({ error: "Report not found" });
    }

    res.json({ report: report[0], timestamp: new Date() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
