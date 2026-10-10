const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body.error || "Request failed", res.status);
  }
  return body as T;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  register: (username: string, password: string) =>
    request<{ token: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  me: (token: string) => request<Player>("/api/game/me", {}, token),
  fleet: (token: string) => request<Ship[]>("/api/game/fleet", {}, token),
  combatLog: (token: string) => request<CombatEvent[]>("/api/game/combat-log", {}, token),
  economy: (token: string) => request<MarketEntry[]>("/api/game/economy", {}, token),
};

export const API_BASE_URL = API_URL;

export interface Player {
  id: string;
  username: string;
  credits: number;
  rank: string;
  level: number;
  guild: string;
  stats: {
    attack: number;
    defense: number;
    shield: number;
    cargo: number;
  };
}

export interface Ship {
  id: string;
  name: string;
  location: string;
  hp: number;
  hpMax: number;
  shield: number;
  status: "docked" | "idle" | "combat" | "patrol" | string;
}

export interface CombatEvent {
  id: string;
  time: number;
  message: string;
  outcome: "victory" | "defeat" | string;
}

export interface MarketEntry {
  resource: string;
  price: number;
  change: number;
  supply: string;
}
