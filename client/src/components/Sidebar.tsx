import type { Ship } from "../api/client";
import "./Sidebar.css";

interface SidebarProps {
  ships: Ship[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const STATUS_COLOR: Record<string, string> = {
  docked: "#868e96",
  idle: "#20c997",
  combat: "#ff6b6b",
  patrol: "#51cf66",
};

export function Sidebar({ ships, selectedId, onSelect }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar__heading">Fleet</div>
      <ul className="sidebar__list">
        {ships.map((ship) => {
          const hpPct = Math.round((ship.hp / ship.hpMax) * 100);
          return (
            <li key={ship.id}>
              <button
                className={`sidebar__item ${selectedId === ship.id ? "sidebar__item--active" : ""}`}
                onClick={() => onSelect(ship.id)}
              >
                <div className="sidebar__item-row">
                  <span className="sidebar__item-name">{ship.name}</span>
                  <span className="sidebar__item-status" style={{ color: STATUS_COLOR[ship.status] ?? "#868e96" }}>
                    {ship.status}
                  </span>
                </div>
                <div className="sidebar__item-location">{ship.location}</div>
                <div className="sidebar__mini-track">
                  <div className="sidebar__mini-fill" style={{ width: `${hpPct}%` }} />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
