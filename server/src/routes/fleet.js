import express from "express";
import { authMiddleware } from "../auth.js";
import { randomUUID } from "crypto";
import { executeQuery } from "../db.js";

const router = express.Router();
router.use(authMiddleware);

// GET /api/fleet/ships - Get all player's ships
router.get("/ships", async (req, res) => {
  try {
    const playerId = req.user.sub;
    const ships = await executeQuery(
      `SELECT s.*, sc.class_name FROM ships s 
       LEFT JOIN ship_classes sc ON s.class_id = sc.id 
       WHERE s.player_id = ? ORDER BY s.built_at DESC`,
      [playerId]
    );
    res.json({ ships, count: ships.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/fleet/ship/:shipId - Get specific ship details
router.get("/ship/:shipId", async (req, res) => {
  try {
    const { shipId } = req.params;
    const ships = await executeQuery(
      `SELECT s.*, sc.class_name FROM ships s 
       LEFT JOIN ship_classes sc ON s.class_id = sc.id 
       WHERE s.id = ?`,
      [shipId]
    );
    
    if (!ships || ships.length === 0) {
      return res.status(404).json({ error: "Ship not found" });
    }

    // Get upgrades
    const upgrades = await executeQuery(
      "SELECT * FROM ship_upgrades WHERE ship_id = ?",
      [shipId]
    );

    res.json({ ship: ships[0], upgrades });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/fleet/classes - Get available ship classes
router.get("/classes", async (req, res) => {
  try {
    const classes = await executeQuery("SELECT * FROM ship_classes ORDER BY base_attack DESC");
    res.json({ classes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/fleet/build - Build a new ship
router.post("/build", async (req, res) => {
  try {
    const { classId, shipName } = req.body;
    const playerId = req.user.sub;

    if (!classId || !shipName) {
      return res.status(400).json({ error: "classId and shipName are required" });
    }

    // Get ship class
    const classes = await executeQuery(
      "SELECT * FROM ship_classes WHERE id = ?",
      [classId]
    );

    if (!classes || classes.length === 0) {
      return res.status(404).json({ error: "Ship class not found" });
    }

    const shipClass = classes[0];

    // Check player credits
    const player = await executeQuery("SELECT credits FROM players WHERE id = ?", [playerId]);
    if (!player || player.length === 0 || player[0].credits < shipClass.build_cost) {
      return res.status(400).json({ error: "Insufficient credits to build this ship" });
    }

    // Create ship
    const shipId = randomUUID();
    const now = new Date();
    const builtAt = new Date(now.getTime() + shipClass.build_time_minutes * 60000);

    await executeQuery(
      `INSERT INTO ships (id, player_id, class_id, name, status, hp, hp_max, shield, shield_max, 
       attack, defense, cargo_capacity, crew_count, built_at, location_x, location_y, location_name)
       VALUES (?, ?, ?, ?, 'docked', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'Dock')`,
      [
        shipId,
        playerId,
        classId,
        shipName,
        shipClass.base_hp,
        shipClass.base_hp,
        shipClass.base_shield,
        shipClass.base_shield,
        shipClass.base_attack,
        shipClass.base_defense,
        shipClass.base_cargo,
        shipClass.crew_capacity,
        builtAt,
      ]
    );

    // Deduct credits
    await executeQuery(
      "UPDATE players SET credits = credits - ? WHERE id = ?",
      [shipClass.build_cost, playerId]
    );

    res.status(201).json({
      success: true,
      message: `Ship '${shipName}' is being built. Ready in ${shipClass.build_time_minutes} minutes.`,
      ship: {
        id: shipId,
        name: shipName,
        classId,
        className: shipClass.class_name,
        status: "docked",
        buildTime: shipClass.build_time_minutes,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/fleet/fleets - Get all player's fleets
router.get("/fleets", async (req, res) => {
  try {
    const playerId = req.user.sub;
    const fleets = await executeQuery(
      `SELECT f.*, COUNT(fs.ship_id) as ship_count
       FROM fleets f
       LEFT JOIN fleet_ships fs ON f.id = fs.fleet_id
       WHERE f.player_id = ?
       GROUP BY f.id`,
      [playerId]
    );
    res.json({ fleets });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/fleet/fleet/create - Create a new fleet
router.post("/fleet/create", async (req, res) => {
  try {
    const { fleetName, formation } = req.body;
    const playerId = req.user.sub;

    if (!fleetName) {
      return res.status(400).json({ error: "fleetName is required" });
    }

    const fleetId = randomUUID();
    await executeQuery(
      "INSERT INTO fleets (id, player_id, fleet_name, formation) VALUES (?, ?, ?, ?)",
      [fleetId, playerId, fleetName, formation || "line"]
    );

    res.status(201).json({
      success: true,
      message: `Fleet '${fleetName}' created successfully`,
      fleet: { id: fleetId, name: fleetName, formation: formation || "line" },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/fleet/fleet/:fleetId/add-ship - Add ship to fleet
router.post("/fleet/:fleetId/add-ship", async (req, res) => {
  try {
    const { fleetId } = req.params;
    const { shipId } = req.body;
    const playerId = req.user.sub;

    if (!shipId) {
      return res.status(400).json({ error: "shipId is required" });
    }

    // Verify fleet ownership
    const fleet = await executeQuery(
      "SELECT * FROM fleets WHERE id = ? AND player_id = ?",
      [fleetId, playerId]
    );

    if (!fleet || fleet.length === 0) {
      return res.status(404).json({ error: "Fleet not found" });
    }

    // Verify ship ownership
    const ship = await executeQuery(
      "SELECT * FROM ships WHERE id = ? AND player_id = ?",
      [shipId, playerId]
    );

    if (!ship || ship.length === 0) {
      return res.status(404).json({ error: "Ship not found" });
    }

    // Add ship to fleet
    await executeQuery(
      "INSERT INTO fleet_ships (fleet_id, ship_id) VALUES (?, ?)",
      [fleetId, shipId]
    );

    res.json({ success: true, message: "Ship added to fleet" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/fleet/move - Move a ship or fleet to coordinates
router.post("/move", async (req, res) => {
  try {
    const { shipId, fleetId, destX, destY, destName } = req.body;
    const playerId = req.user.sub;

    if (!destX || !destY) {
      return res.status(400).json({ error: "Destination coordinates required" });
    }

    if (!shipId && !fleetId) {
      return res.status(400).json({ error: "shipId or fleetId required" });
    }

    if (shipId) {
      // Move single ship
      const ship = await executeQuery(
        "SELECT * FROM ships WHERE id = ? AND player_id = ?",
        [shipId, playerId]
      );

      if (!ship || ship.length === 0) {
        return res.status(404).json({ error: "Ship not found" });
      }

      const currentShip = ship[0];
      const distance = Math.sqrt(
        Math.pow(destX - currentShip.location_x, 2) + Math.pow(destY - currentShip.location_y, 2)
      );

      // Queue movement
      await executeQuery(
        `INSERT INTO fleet_movements (player_id, ship_id, destination_x, destination_y, destination_name, distance, status)
         VALUES (?, ?, ?, ?, ?, ?, 'queued')`,
        [playerId, shipId, destX, destY, destName || `(${destX}, ${destY})`, Math.ceil(distance)]
      );

      // Update ship status
      await executeQuery(
        `UPDATE ships SET status = 'moving', destination_x = ?, destination_y = ?, destination_name = ? WHERE id = ?`,
        [destX, destY, destName || `(${destX}, ${destY})`, shipId]
      );

      res.json({
        success: true,
        message: `Ship en route to ${destName || `(${destX}, ${destY})`}`,
        distance: Math.ceil(distance),
        estimatedTime: `${Math.ceil(distance / 10)} minutes`,
      });
    } else {
      // Move entire fleet
      const fleetShips = await executeQuery(
        `SELECT s.id FROM fleet_ships fs
         JOIN ships s ON fs.ship_id = s.id
         WHERE fs.fleet_id = ? AND s.player_id = ?`,
        [fleetId, playerId]
      );

      if (!fleetShips || fleetShips.length === 0) {
        return res.status(400).json({ error: "Fleet has no ships" });
      }

      for (const { id: shipId } of fleetShips) {
        const ship = await executeQuery("SELECT * FROM ships WHERE id = ?", [shipId]);
        if (ship && ship.length > 0) {
          const currentShip = ship[0];
          const distance = Math.sqrt(
            Math.pow(destX - currentShip.location_x, 2) + Math.pow(destY - currentShip.location_y, 2)
          );

          await executeQuery(
            `INSERT INTO fleet_movements (player_id, fleet_id, ship_id, destination_x, destination_y, destination_name, distance, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'queued')`,
            [playerId, fleetId, shipId, destX, destY, destName || `(${destX}, ${destY})`, Math.ceil(distance)]
          );

          await executeQuery(
            `UPDATE ships SET status = 'moving', destination_x = ?, destination_y = ?, destination_name = ? WHERE id = ?`,
            [destX, destY, destName || `(${destX}, ${destY})`, shipId]
          );
        }
      }

      res.json({
        success: true,
        message: `Fleet en route to ${destName || `(${destX}, ${destY})`}`,
        shipsMoving: fleetShips.length,
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/fleet/nearby - Scan for nearby players/threats
router.get("/nearby", async (req, res) => {
  try {
    const playerId = req.user.sub;
    const { range = 100 } = req.query;

    // Get player's ship positions
    const playerShips = await executeQuery(
      `SELECT player_id, location_x, location_y FROM ships WHERE player_id = ? AND status != 'docked'`,
      [playerId]
    );

    if (!playerShips || playerShips.length === 0) {
      return res.json({ nearbyPlayers: [], message: "No ships deployed" });
    }

    // Find nearby players within range
    const nearbyResults = [];
    for (const playerShip of playerShips) {
      const nearby = await executeQuery(
        `SELECT DISTINCT p.id, p.username, COUNT(s.id) as ship_count,
         SQRT(POW(s.location_x - ?, 2) + POW(s.location_y - ?, 2)) as distance
         FROM ships s
         JOIN players p ON s.player_id = p.id
         WHERE s.player_id != ? AND s.status != 'docked'
         AND SQRT(POW(s.location_x - ?, 2) + POW(s.location_y - ?, 2)) <= ?
         GROUP BY p.id
         ORDER BY distance ASC`,
        [playerShip.location_x, playerShip.location_y, playerId, playerShip.location_x, playerShip.location_y, range]
      );

      nearbyResults.push(...nearby);
    }

    res.json({ nearbyPlayers: nearbyResults, scanRange: range });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/fleet/engage - Initiate PvP combat
router.post("/engage", async (req, res) => {
  try {
    const { targetPlayerId, attackingFleetId } = req.body;
    const playerId = req.user.sub;

    if (!targetPlayerId || !attackingFleetId) {
      return res.status(400).json({ error: "targetPlayerId and attackingFleetId required" });
    }

    // Get attacking fleet
    const fleet = await executeQuery(
      "SELECT * FROM fleets WHERE id = ? AND player_id = ?",
      [attackingFleetId, playerId]
    );

    if (!fleet || fleet.length === 0) {
      return res.status(404).json({ error: "Fleet not found" });
    }

    // Get defender's fleet
    const defenderFleets = await executeQuery(
      "SELECT id FROM fleets WHERE player_id = ? LIMIT 1",
      [targetPlayerId]
    );

    const engagementId = randomUUID();
    await executeQuery(
      `INSERT INTO pvp_engagements (id, attacker_player_id, attacker_fleet_id, defender_player_id, defender_fleet_id, status)
       VALUES (?, ?, ?, ?, ?, 'initiated')`,
      [engagementId, playerId, attackingFleetId, targetPlayerId, defenderFleets?.[0]?.id || null]
    );

    res.status(201).json({
      success: true,
      message: "PvP engagement initiated",
      engagementId,
      status: "Awaiting defender response...",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/fleet/engagements - Get active engagements
router.get("/engagements", async (req, res) => {
  try {
    const playerId = req.user.sub;
    const engagements = await executeQuery(
      `SELECT e.*, ap.username as attacker_name, dp.username as defender_name
       FROM pvp_engagements e
       JOIN players ap ON e.attacker_player_id = ap.id
       JOIN players dp ON e.defender_player_id = dp.id
       WHERE (e.attacker_player_id = ? OR e.defender_player_id = ?) AND e.status IN ('initiated', 'active')
       ORDER BY e.battle_start DESC`,
      [playerId, playerId]
    );

    res.json({ engagements, count: engagements.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
