import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api, type CombatEvent, type MarketEntry, type Ship } from "../api/client";
import { getSocket } from "../api/socket";
import { TopNav } from "../components/TopNav";
import { PlayerStatsPanel } from "../components/PlayerStatsPanel";
import { FleetDetail } from "../components/FleetDetail";
import { FleetManagement } from "../components/FleetManagement";
import { CombatLogPanel } from "../components/CombatLogPanel";
import { EconomyPanel } from "../components/EconomyPanel";
import { GalaxyMap } from "../components/GalaxyMap";
import "./Dashboard.css";

const CONTENT_TABS = ["Fleet", "Combat Log", "Economy"];

export function Dashboard() {
  const { token, player } = useAuth();
  const [activeTab, setActiveTab] = useState("Base");
  const [contentTab, setContentTab] = useState("Fleet");
  const [ships, setShips] = useState<Ship[]>([]);
  const [selectedShipId, setSelectedShipId] = useState<string | null>(null);
  const [combatLog, setCombatLog] = useState<CombatEvent[]>([]);
  const [market, setMarket] = useState<MarketEntry[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    const [fleet, log, econ] = await Promise.all([
      api.fleet(token),
      api.combatLog(token),
      api.economy(token),
    ]);
    setShips(fleet);
    setCombatLog(log);
    setMarket(econ);
    setSelectedShipId((prev) => prev ?? fleet[0]?.id ?? null);
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onEconomy = (data: MarketEntry[]) => setMarket(data);
    const onCombat = (event: CombatEvent) => setCombatLog((prev) => [event, ...prev].slice(0, 20));
    socket.on("economy:update", onEconomy);
    socket.on("combat:update", onCombat);
    return () => {
      socket.off("economy:update", onEconomy);
      socket.off("combat:update", onCombat);
    };
  }, [ships]);

  const selectedShip = ships.find((s) => s.id === selectedShipId) ?? null;

  return (
    <div className="dashboard">
      <TopNav activeTab={activeTab} onTabChange={setActiveTab} onSettings={() => setSettingsOpen(true)} />
      <div className="dashboard__body">
        {activeTab === "Fleet" ? (
          <main className="dashboard__main dashboard__main--full">
            <FleetManagement />
          </main>
        ) : (
          <>
            <GalaxyMap ships={ships} selectedShipId={selectedShipId} onSelectShip={setSelectedShipId} />

            <main className="dashboard__main dashboard__main--overlay">
              <div className="dashboard__content-tabs">
                {CONTENT_TABS.map((tab) => (
                  <button
                    key={tab}
                    className={`dashboard__content-tab ${contentTab === tab ? "dashboard__content-tab--active" : ""}`}
                    onClick={() => setContentTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {contentTab === "Fleet" && <FleetDetail ship={selectedShip} />}
              {contentTab === "Combat Log" && <CombatLogPanel events={combatLog} />}
              {contentTab === "Economy" && <EconomyPanel market={market} />}
            </main>

            <PlayerStatsPanel player={player} />
          </>
        )}
      </div>
      {settingsOpen && (
        <div className="settings-backdrop" onClick={() => setSettingsOpen(false)}>
          <section className="settings-panel" onClick={(event) => event.stopPropagation()}>
            <button className="settings-panel__close" onClick={() => setSettingsOpen(false)} aria-label="Close settings">x</button>
            <div className="galaxy-map__eyebrow">Command interface</div>
            <h2>Settings</h2>
            <label><span>Map labels</span><input type="checkbox" defaultChecked /></label>
            <label><span>Fleet notifications</span><input type="checkbox" defaultChecked /></label>
            <label><span>Reduced motion</span><input type="checkbox" /></label>
          </section>
        </div>
      )}
    </div>
  );
}
