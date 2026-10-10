import "./StatBar.css";

interface StatBarProps {
  leftLabel: string;
  leftValue: string;
  rightLabel?: string;
  rightValue: string;
  percent: number;
  variant?: "hp" | "shield" | "attack" | "defense" | "cargo" | "credits";
}

export function StatBar({ leftLabel, leftValue, rightLabel, rightValue, percent, variant = "hp" }: StatBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={`stat-bar stat-bar--${variant}`}>
      <div className="stat-bar__side stat-bar__side--left">
        <span className="stat-bar__label">{leftLabel}</span>
        <span className="stat-bar__value">{leftValue}</span>
      </div>
      <div className="stat-bar__track">
        <div className="stat-bar__fill" style={{ width: `${clamped}%` }} />
      </div>
      <div className="stat-bar__side stat-bar__side--right">
        <span className="stat-bar__label">{rightLabel ?? "Max"}</span>
        <span className="stat-bar__value">{rightValue}</span>
      </div>
    </div>
  );
}
