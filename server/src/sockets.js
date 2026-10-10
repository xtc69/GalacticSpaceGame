import { verifyToken } from "./auth.js";
import { market, combatLogs, players } from "./store.js";
import { randomUUID } from "crypto";

export function attachSockets(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      socket.user = verifyToken(token);
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(socket.user.sub);

    // Periodic mock market ticks so the economy panel feels alive.
    const marketTimer = setInterval(() => {
      for (const entry of market) {
        const delta = (Math.random() - 0.5) * entry.price * 0.02;
        entry.price = Math.max(0.1, +(entry.price + delta).toFixed(2));
        entry.change = +delta.toFixed(2);
      }
      io.emit("economy:update", market);
    }, 5000);

    // Occasional mock combat events for the logged-in player.
    const combatTimer = setInterval(() => {
      if (Math.random() > 0.7) {
        const player = players.get(socket.user.sub);
        if (!player) return;
        const log = combatLogs.get(socket.user.sub) || [];
        const event = {
          id: randomUUID(),
          time: Date.now(),
          message: `Hostile contact reported near ${["Void 5", "Reverie 2", "Tidal 2", "Aethria 2"][Math.floor(Math.random() * 4)]}`,
          outcome: Math.random() > 0.5 ? "victory" : "defeat",
        };
        log.unshift(event);
        combatLogs.set(socket.user.sub, log.slice(0, 20));
        socket.emit("combat:update", event);
      }
    }, 12000);

    socket.on("disconnect", () => {
      clearInterval(marketTimer);
      clearInterval(combatTimer);
    });
  });
}
