import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import authRoutes from "./routes/auth.js";
import gameRoutes from "./routes/game.js";
import reportsRoutes from "./routes/reports.js";
import fleetRoutes from "./routes/fleet.js";
import { attachSockets } from "./sockets.js";
import { initializeDatabase } from "./db.js";
import { initializeScheduler, stopScheduler } from "./services/scheduler.js";

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/fleet", fleetRoutes);
app.get("/api/health", (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: CLIENT_ORIGIN } });
attachSockets(io);

// Initialize database and start scheduler
async function startup() {
  try {
    console.log("Initializing database...");
    await initializeDatabase();
    console.log("Database initialized successfully!");

    console.log("Initializing report scheduler...");
    initializeScheduler();

    httpServer.listen(PORT, () => {
      console.log(`Space server listening on http://localhost:${PORT}`);
      console.log("Demo login -> username: commander, password: password123");
      console.log("Reports API available at /api/reports");
    });
  } catch (error) {
    console.error("Error during startup:", error);
    process.exit(1);
  }
}

startup();

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down gracefully...");
  stopScheduler();
  httpServer.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
