import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

// In-memory data store (swap for a real DB later).
export const players = new Map();
export const fleets = new Map(); // playerId -> ships[]
export const combatLogs = new Map(); // playerId -> events[]

export const market = [
  { resource: "Titanium Ore", price: 42.5, change: 1.2, supply: "Medium" },
  { resource: "Drinking Water", price: 3.1, change: -0.4, supply: "High" },
  { resource: "Antimatter", price: 980.0, change: 6.8, supply: "Low" },
  { resource: "Fine Rations", price: 12.4, change: 0.2, supply: "Medium" },
  { resource: "Exosuit", price: 210.0, change: -2.1, supply: "Low" },
  { resource: "Workwear", price: 18.7, change: 0.6, supply: "High" },
];

function seedPlayer(username, password) {
  const id = randomUUID();
  const player = {
    id,
    username,
    passwordHash: bcrypt.hashSync(password, 8),
    credits: 33_866_871,
    rank: "Commander",
    level: 37,
    guild: "Guild 435",
    stats: {
      attack: 8420,
      defense: 6310,
      shield: 5120,
      cargo: 92000,
    },
  };
  players.set(id, player);
  fleets.set(id, [
    { id: randomUUID(), name: "100_15k", location: "Aquila 2", hp: 15000, hpMax: 15000, shield: 4200, status: "docked" },
    { id: randomUUID(), name: "100_30K", location: "Exchange Station", hp: 22000, hpMax: 30000, shield: 3900, status: "idle" },
    { id: randomUUID(), name: "150_45k", location: "Exchange Station", hp: 45000, hpMax: 45000, shield: 6100, status: "idle" },
    { id: randomUUID(), name: "250_10k", location: "Enigma 5", hp: 8500, hpMax: 10000, shield: 1200, status: "combat" },
    { id: randomUUID(), name: "250_60k", location: "Unknown", hp: 60000, hpMax: 60000, shield: 9000, status: "patrol" },
  ]);
  combatLogs.set(id, [
    { id: randomUUID(), time: Date.now() - 3600_000, message: "Fleet 250_10k engaged pirates near Enigma 5", outcome: "victory" },
    { id: randomUUID(), time: Date.now() - 7200_000, message: "Ambushed by [RVL] near Void 5", outcome: "defeat" },
  ]);
  return player;
}

export function findPlayerByUsername(username) {
  return [...players.values()].find((p) => p.username === username);
}

export function createPlayer(username, password) {
  if (findPlayerByUsername(username)) {
    throw new Error("Username already taken");
  }
  return seedPlayer(username, password);
}

// Demo account so the UI has data immediately.
seedPlayer("commander", "password123");
