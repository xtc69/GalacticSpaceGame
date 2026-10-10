import type { Ship } from "../api/client";
import { StatBar } from "./StatBar";
import "./FleetDetail.css";

interface FleetDetailProps {
  ship: Ship | null;
}

export function FleetDetail({ ship }: FleetDetailProps) {
  if (!ship) {
    return <div className="fleet-detail fleet-detail--empty">Select a ship to view its stats.</div>;
  }

  return (
    <div className="fleet-detail">
      <div className="fleet-detail__header">
        <h2>{ship.name}</h2>
        <span className={`fleet-detail__status fleet-detail__status--${ship.status}`}>{ship.status}</span>
      </div>
      <div className="fleet-detail__location">Location: {ship.location}</div>

      <StatBar
        variant="hp"
        leftLabel="Hull"
        leftValue={ship.hp.toLocaleString()}
        rightLabel="Max"
        rightValue={ship.hpMax.toLocaleString()}
        percent={(ship.hp / ship.hpMax) * 100}
      />
      <StatBar
        variant="shield"
        leftLabel="Shield"
        leftValue={ship.shield.toLocaleString()}
        rightLabel="Cap"
        rightValue={Math.round(ship.shield * 1.4).toLocaleString()}
        percent={(ship.shield / (ship.shield * 1.4)) * 100}
      />

      <div className="fleet-detail__actions">
        <button className="fleet-detail__btn fleet-detail__btn--attack">Engage Target</button>
        <button className="fleet-detail__btn">Recall to Base</button>
      </div>
    </div>
  );
}
