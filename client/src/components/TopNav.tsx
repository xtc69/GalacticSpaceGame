import { useAuth } from "../context/AuthContext";
import "./TopNav.css";

const TABS = ["Base", "Fleet", "Galaxy", "R&D", "Missions", "Comms", "Guild"];

interface TopNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSettings: () => void;
}

export function TopNav({ activeTab, onTabChange, onSettings }: TopNavProps) {
  const { player, logout } = useAuth();

  return (
    <header className="topnav">
      <div className="topnav__brand">
        <div className="topnav__logo">⚔</div>
        <span style={{ fontSize: '14px', fontWeight: 600, marginLeft: '8px' }}>Space Battle's</span>
      </div>
      <nav className="topnav__tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`topnav__tab ${activeTab === tab ? "topnav__tab--active" : ""}`}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>
      <div className="topnav__status">
        <span className="topnav__credits">⛁ {player?.credits.toLocaleString() ?? "--"}</span>
        <span className="topnav__badge">★ {player?.level ?? "--"}</span>
        <span className="topnav__badge">⚔ Rank</span>
        <button className="topnav__settings" onClick={onSettings} title="Open settings" aria-label="Open settings">⚙</button>
        <button className="topnav__avatar" onClick={logout} title="Log out">
          {player?.username?.[0]?.toUpperCase() ?? "?"}
        </button>
      </div>
    </header>
  );
}
