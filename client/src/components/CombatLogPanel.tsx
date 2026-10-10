import type { CombatEvent } from "../api/client";
import "./CombatLogPanel.css";

interface CombatLogPanelProps {
  events: CombatEvent[];
}

export function CombatLogPanel({ events }: CombatLogPanelProps) {
  return (
    <div className="combat-log">
      <h2>Combat Log</h2>
      {events.length === 0 && <div className="combat-log__empty">No combat activity yet.</div>}
      <ul className="combat-log__list">
        {events.map((event) => (
          <li key={event.id} className={`combat-log__item combat-log__item--${event.outcome}`}>
            <span className="combat-log__outcome">{event.outcome === "victory" ? "Victory" : "Defeat"}</span>
            <span className="combat-log__message">{event.message}</span>
            <span className="combat-log__time">{new Date(event.time).toLocaleTimeString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
