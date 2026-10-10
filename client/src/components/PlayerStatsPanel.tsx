import type { Player } from "../api/client";
import { StatBar } from "./StatBar";
import "./PlayerStatsPanel.css";

interface PlayerStatsPanelProps {
  player: Player | null;
}

export function PlayerStatsPanel({ player }: PlayerStatsPanelProps) {
  if (!player) return null;
  const { stats } = player;

  return (
    <aside className="stats-panel">
      <div className="stats-panel__heading">Commander</div>
      <div className="stats-panel__identity">
        <div className="stats-panel__name">{player.username}</div>
        <div className="stats-panel__meta">{player.rank} · {player.guild}</div>
      </div>

      <StatBar
        variant="attack"
        leftLabel="Attack"
        leftValue={stats.attack.toLocaleString()}
        rightLabel="Rating"
        rightValue="A+"
        percent={70}
      />
      <StatBar
        variant="defense"
        leftLabel="Defense"
        leftValue={stats.defense.toLocaleString()}
        rightLabel="Rating"
        rightValue="A"
        percent={62}
      />
      <StatBar
        variant="shield"
        leftLabel="Shield"
        leftValue={stats.shield.toLocaleString()}
        rightLabel="Cap"
        rightValue="8,000"
        percent={64}
      />
      <StatBar
        variant="cargo"
        leftLabel="Cargo"
        leftValue={stats.cargo.toLocaleString()}
        rightLabel="Cap"
        rightValue="150,000"
        percent={(stats.cargo / 150000) * 100}
      />
      <StatBar
        variant="credits"
        leftLabel="Credits"
        leftValue={player.credits.toLocaleString()}
        rightLabel="Level"
        rightValue={String(player.level)}
        percent={80}
      />
    </aside>
  );
}
