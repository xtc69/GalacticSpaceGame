import { useEffect, useState } from "react";
import type { Ship } from "../api/client";
import "./FleetManagement.css";

interface ShipClass {
  id: number;
  class_name: string;
  base_attack: number;
  base_defense: number;
  base_shield: number;
  base_hp: number;
  build_cost: number;
  build_time_minutes: number;
  crew_capacity: number;
}

interface Fleet {
  id: string;
  fleet_name: string;
  formation: string;
  ship_count: number;
}

export function FleetManagement() {
  const [ships, setShips] = useState<any[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [shipClasses, setShipClasses] = useState<ShipClass[]>([]);
  const [selectedShip, setSelectedShip] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "builder" | "scanner" | "engagements">("overview");
  const [buildingShip, setBuildingShip] = useState(false);
  const [newShipName, setNewShipName] = useState("");
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [moveDestX, setMoveDestX] = useState("");
  const [moveDestY, setMoveDestY] = useState("");
  const [nearbyPlayers, setNearbyPlayers] = useState<any[]>([]);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [scanActive, setScanActive] = useState(false);

  useEffect(() => {
    const fetchShips = async () => {
      try {
        const response = await fetch("/api/fleet/ships", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await response.json();
        setShips(data.ships || []);
      } catch (error) {
        console.error("Error fetching ships:", error);
      }
    };

    const fetchClasses = async () => {
      try {
        const response = await fetch("/api/fleet/classes", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await response.json();
        setShipClasses(data.classes || []);
      } catch (error) {
        console.error("Error fetching ship classes:", error);
      }
    };

    const fetchFleets = async () => {
      try {
        const response = await fetch("/api/fleet/fleets", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await response.json();
        setFleets(data.fleets || []);
      } catch (error) {
        console.error("Error fetching fleets:", error);
      }
    };

    const fetchEngagements = async () => {
      try {
        const response = await fetch("/api/fleet/engagements", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await response.json();
        setEngagements(data.engagements || []);
      } catch (error) {
        console.error("Error fetching engagements:", error);
      }
    };

    fetchShips();
    fetchClasses();
    fetchFleets();
    fetchEngagements();

    const interval = setInterval(() => {
      fetchShips();
      fetchEngagements();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleBuildShip = async () => {
    if (!selectedClass || !newShipName) return;
    setBuildingShip(true);
    try {
      const response = await fetch("/api/fleet/build", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ classId: selectedClass, shipName: newShipName }),
      });
      if (response.ok) {
        alert(`Ship '${newShipName}' is being built!`);
        setNewShipName("");
        setSelectedClass(null);
        const shipsResponse = await fetch("/api/fleet/ships", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const shipsData = await shipsResponse.json();
        setShips(shipsData.ships || []);
      }
    } catch (error) {
      console.error("Error building ship:", error);
    } finally {
      setBuildingShip(false);
    }
  };

  const handleMoveShip = async () => {
    if (!selectedShip || !moveDestX || !moveDestY) return;
    try {
      const response = await fetch("/api/fleet/move", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          shipId: selectedShip.id,
          destX: parseFloat(moveDestX),
          destY: parseFloat(moveDestY),
        }),
      });
      if (response.ok) {
        alert(`${selectedShip.name} is en route!`);
        setMoveDestX("");
        setMoveDestY("");
      }
    } catch (error) {
      console.error("Error moving ship:", error);
    }
  };

  const handleScan = async () => {
    setScanActive(true);
    try {
      const response = await fetch("/api/fleet/nearby", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      setNearbyPlayers(data.nearbyPlayers || []);
    } catch (error) {
      console.error("Error scanning:", error);
    } finally {
      setScanActive(false);
    }
  };

  const getThreatLevel = (distance: number): { level: string; color: string } => {
    if (distance < 20) return { level: "EXTREME", color: "#ff6b6b" };
    if (distance < 50) return { level: "HIGH", color: "#ffa94d" };
    if (distance < 100) return { level: "MEDIUM", color: "#51cf66" };
    return { level: "LOW", color: "#20c997" };
  };

  const getTotalStats = () => {
    const stats = ships.reduce(
      (acc, ship) => ({
        totalAttack: acc.totalAttack + (ship.attack || 0),
        totalDefense: acc.totalDefense + (ship.defense || 0),
        totalShield: acc.totalShield + (ship.shield || 0),
        totalHP: acc.totalHP + (ship.hp || 0),
      }),
      { totalAttack: 0, totalDefense: 0, totalShield: 0, totalHP: 0 }
    );
    return stats;
  };

  const stats = getTotalStats();

  return (
    <div className="fleet-management">
      <div className="fleet-management__header">
        <div className="fleet-management__title">⚔️ Fleet Command Center</div>
        <div className="fleet-management__quick-stats">
          <div className="fleet-management__stat">
            <span className="fleet-management__stat-label">Ships:</span>
            <span className="fleet-management__stat-value">{ships.length}</span>
          </div>
          <div className="fleet-management__stat">
            <span className="fleet-management__stat-label">Atk:</span>
            <span className="fleet-management__stat-value">{stats.totalAttack}</span>
          </div>
          <div className="fleet-management__stat">
            <span className="fleet-management__stat-label">Def:</span>
            <span className="fleet-management__stat-value">{stats.totalDefense}</span>
          </div>
          <div className="fleet-management__stat">
            <span className="fleet-management__stat-label">Shld:</span>
            <span className="fleet-management__stat-value">{stats.totalShield}</span>
          </div>
        </div>
      </div>

      <div className="fleet-management__grid">
        <div className="fleet-management__left">
          <div className="fleet-management__panel">
            <div className="fleet-management__panel-title">Fleet ({ships.length})</div>
            <div className="fleet-management__fleet-list">
              {ships.length === 0 ? (
                <div className="fleet-management__empty">No ships</div>
              ) : (
                ships.map((ship) => (
                  <div
                    key={ship.id}
                    className={`fleet-management__ship-compact ${selectedShip?.id === ship.id ? "active" : ""}`}
                    onClick={() => setSelectedShip(ship)}
                  >
                    <div className="fleet-management__ship-row">
                      <div className="fleet-management__ship-name">{ship.name}</div>
                      <div className={`fleet-management__ship-status-badge status-${ship.status}`}>
                        {ship.status[0].toUpperCase()}
                      </div>
                    </div>
                    <div className="fleet-management__ship-bars">
                      <div className="fleet-management__bar">
                        <div className="fleet-management__bar-fill" style={{width: `${(ship.hp / ship.hp_max) * 100}%`, background: "#51cf66"}} />
                      </div>
                      <div className="fleet-management__bar">
                        <div className="fleet-management__bar-fill" style={{width: `${(ship.shield / (ship.shield_max || ship.shield * 1.5)) * 100}%`, background: "#20c997"}} />
                      </div>
                    </div>
                    <div className="fleet-management__ship-mini-stats">
                      <span>{ship.attack}⚔️</span>
                      <span>{ship.defense}🛡️</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="fleet-management__panel">
            <div className="fleet-management__panel-title">Actions</div>
            <div className="fleet-management__action-buttons">
              <button className="fleet-management__action-btn" onClick={() => setActiveTab("builder")}>🔧 Build</button>
              <button className="fleet-management__action-btn" onClick={() => setActiveTab("scanner")}>🔍 Scan</button>
              <button className="fleet-management__action-btn" onClick={() => setActiveTab("engagements")}>💥 Battle</button>
            </div>
          </div>
        </div>

        <div className="fleet-management__center">
          <div className="fleet-management__panel fleet-management__scanner-panel">
            <div className="fleet-management__panel-title">
              🔍 Tactical Scanner
              {scanActive && <span className="fleet-management__scanning">● SCANNING</span>}
            </div>
            <button className="fleet-management__scan-btn" onClick={handleScan} disabled={scanActive}>
              {scanActive ? "SCANNING..." : "INITIATE SCAN"}
            </button>

            {nearbyPlayers.length > 0 ? (
              <div className="fleet-management__targets-compact">
                {nearbyPlayers.slice(0, 5).map((target) => {
                  const threat = getThreatLevel(target.distance);
                  return (
                    <div key={target.id} className="fleet-management__target-mini" style={{ borderLeftColor: threat.color }}>
                      <div className="fleet-management__target-mini-header">
                        <span className="fleet-management__target-mini-name">{target.detected_player_name}</span>
                        <span className="fleet-management__threat-badge" style={{ color: threat.color }}>{threat.level}</span>
                      </div>
                      <div className="fleet-management__target-mini-info">
                        <span>{target.distance.toFixed(1)}u</span>
                        <span>{target.ship_count} ships</span>
                      </div>
                      <button className="fleet-management__engage-btn">ENGAGE</button>
                    </div>
                  );
                })}
                {nearbyPlayers.length > 5 && (
                  <div className="fleet-management__targets-more">+{nearbyPlayers.length - 5} more</div>
                )}
              </div>
            ) : (
              <div className="fleet-management__empty">No targets</div>
            )}
          </div>

          {selectedShip && (
            <div className="fleet-management__panel">
              <div className="fleet-management__panel-title">📊 {selectedShip.name}</div>
              <div className="fleet-management__ship-details-compact">
                <div className="fleet-management__detail-row"><span>Class:</span><span>{selectedShip.class_name}</span></div>
                <div className="fleet-management__detail-row"><span>Position:</span><span>({selectedShip.location_x.toFixed(0)}, {selectedShip.location_y.toFixed(0)})</span></div>
                <div className="fleet-management__detail-bar-row">
                  <div className="fleet-management__detail-label">Hull</div>
                  <div className="fleet-management__detail-bar"><div className="fleet-management__detail-bar-fill" style={{ width: `${(selectedShip.hp / selectedShip.hp_max) * 100}%` }} /></div>
                  <span>{Math.round((selectedShip.hp / selectedShip.hp_max) * 100)}%</span>
                </div>
                <div className="fleet-management__detail-bar-row">
                  <div className="fleet-management__detail-label">Shield</div>
                  <div className="fleet-management__detail-bar"><div className="fleet-management__detail-bar-fill" style={{width: `${(selectedShip.shield / (selectedShip.shield_max || selectedShip.shield * 1.5)) * 100}%`, background: "#20c997"}} /></div>
                  <span>{Math.round((selectedShip.shield / (selectedShip.shield_max || selectedShip.shield * 1.5)) * 100)}%</span>
                </div>

                <div className="fleet-management__deploy-section">
                  <div className="fleet-management__panel-subtitle">Deploy</div>
                  <input type="number" placeholder="X" value={moveDestX} onChange={(e) => setMoveDestX(e.target.value)} className="fleet-management__input-compact" />
                  <input type="number" placeholder="Y" value={moveDestY} onChange={(e) => setMoveDestY(e.target.value)} className="fleet-management__input-compact" />
                  <button onClick={handleMoveShip} className="fleet-management__deploy-btn">Send</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="fleet-management__right">
          {activeTab === "builder" && (
            <div className="fleet-management__panel">
              <div className="fleet-management__panel-title">🔧 Build Ship</div>
              <input type="text" value={newShipName} onChange={(e) => setNewShipName(e.target.value)} placeholder="Name" className="fleet-management__input-compact" />
              <div className="fleet-management__classes-compact">
                {shipClasses.slice(0, 4).map((sc) => (
                  <button key={sc.id} className={`fleet-management__class-mini ${selectedClass === sc.id ? "active" : ""}`} onClick={() => setSelectedClass(sc.id)}>
                    <div>{sc.class_name}</div>
                    <div className="fleet-management__class-mini-cost">{(sc.build_cost / 1000).toFixed(0)}k</div>
                  </button>
                ))}
              </div>
              <button onClick={handleBuildShip} disabled={!selectedClass || !newShipName || buildingShip} className="fleet-management__build-btn">
                {buildingShip ? "BUILDING..." : "BUILD"}
              </button>
            </div>
          )}

          {activeTab === "engagements" && (
            <div className="fleet-management__panel">
              <div className="fleet-management__panel-title">💥 Battles ({engagements.length})</div>
              {engagements.length === 0 ? (
                <div className="fleet-management__empty">None active</div>
              ) : (
                <div className="fleet-management__engagements-compact">
                  {engagements.map((e) => (
                    <div key={e.id} className="fleet-management__engagement-mini">
                      <div className="fleet-management__engagement-row">
                        <span className="fleet-management__engagement-name">{e.attacker_name}</span>
                        <span className="fleet-management__vs">VS</span>
                        <span className="fleet-management__engagement-name">{e.defender_name}</span>
                      </div>
                      <div className="fleet-management__engagement-status-mini">{e.status}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab !== "builder" && activeTab !== "engagements" && (
            <div className="fleet-management__panel">
              <div className="fleet-management__panel-title">⚔️ Formations ({fleets.length})</div>
              {fleets.length === 0 ? (
                <div className="fleet-management__empty">None</div>
              ) : (
                <div className="fleet-management__fleets-compact">
                  {fleets.map((f) => (
                    <div key={f.id} className="fleet-management__fleet-mini">
                      <div className="fleet-management__fleet-mini-name">{f.fleet_name}</div>
                      <div className="fleet-management__fleet-mini-info">
                        <span>{f.formation}</span>
                        <span>🚀 {f.ship_count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
  const [ships, setShips] = useState<any[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [shipClasses, setShipClasses] = useState<ShipClass[]>([]);
  const [selectedShip, setSelectedShip] = useState<any | null>(null);
  const [selectedFleet, setSelectedFleet] = useState<Fleet | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "builder" | "scanner" | "engagements">("overview");
  const [buildingShip, setBuildingShip] = useState(false);
  const [newShipName, setNewShipName] = useState("");
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [moveDestX, setMoveDestX] = useState("");
  const [moveDestY, setMoveDestY] = useState("");
  const [nearbyPlayers, setNearbyPlayers] = useState<any[]>([]);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [scanActive, setScanActive] = useState(false);

  // Fetch ships
  useEffect(() => {
    const fetchShips = async () => {
      try {
        const response = await fetch("/api/fleet/ships", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await response.json();
        setShips(data.ships || []);
      } catch (error) {
        console.error("Error fetching ships:", error);
      }
    };

    const fetchClasses = async () => {
      try {
        const response = await fetch("/api/fleet/classes", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await response.json();
        setShipClasses(data.classes || []);
      } catch (error) {
        console.error("Error fetching ship classes:", error);
      }
    };

    const fetchFleets = async () => {
      try {
        const response = await fetch("/api/fleet/fleets", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await response.json();
        setFleets(data.fleets || []);
      } catch (error) {
        console.error("Error fetching fleets:", error);
      }
    };

    const fetchEngagements = async () => {
      try {
        const response = await fetch("/api/fleet/engagements", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await response.json();
        setEngagements(data.engagements || []);
      } catch (error) {
        console.error("Error fetching engagements:", error);
      }
    };

    fetchShips();
    fetchClasses();
    fetchFleets();
    fetchEngagements();

    const interval = setInterval(() => {
      fetchShips();
      fetchEngagements();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleBuildShip = async () => {
    if (!selectedClass || !newShipName) return;

    setBuildingShip(true);
    try {
      const response = await fetch("/api/fleet/build", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          classId: selectedClass,
          shipName: newShipName,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        alert(`Ship '${newShipName}' is being built!`);
        setNewShipName("");
        setSelectedClass(null);
        // Refresh ships
        const shipsResponse = await fetch("/api/fleet/ships", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const shipsData = await shipsResponse.json();
        setShips(shipsData.ships || []);
      }
    } catch (error) {
      console.error("Error building ship:", error);
      alert("Failed to build ship");
    } finally {
      setBuildingShip(false);
    }
  };

  const handleMoveShip = async () => {
    if (!selectedShip || !moveDestX || !moveDestY) return;

    try {
      const response = await fetch("/api/fleet/move", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          shipId: selectedShip.id,
          destX: parseFloat(moveDestX),
          destY: parseFloat(moveDestY),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        alert(`${selectedShip.name} is en route!`);
        setMoveDestX("");
        setMoveDestY("");
      }
    } catch (error) {
      console.error("Error moving ship:", error);
    }
  };

  const handleScan = async () => {
    setScanActive(true);
    try {
      const response = await fetch("/api/fleet/nearby", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      setNearbyPlayers(data.nearbyPlayers || []);
    } catch (error) {
      console.error("Error scanning:", error);
    } finally {
      setScanActive(false);
    }
  };

  const getThreatLevel = (distance: number): { level: string; color: string } => {
    if (distance < 20) return { level: "EXTREME", color: "#ff6b6b" };
    if (distance < 50) return { level: "HIGH", color: "#ffa94d" };
    if (distance < 100) return { level: "MEDIUM", color: "#51cf66" };
    return { level: "LOW", color: "#20c997" };
  };

  const getTotalStats = () => {
    const stats = ships.reduce(
      (acc, ship) => ({
        totalAttack: acc.totalAttack + (ship.attack || 0),
        totalDefense: acc.totalDefense + (ship.defense || 0),
        totalShield: acc.totalShield + (ship.shield || 0),
        totalHP: acc.totalHP + (ship.hp || 0),
      }),
      { totalAttack: 0, totalDefense: 0, totalShield: 0, totalHP: 0 }
    );
    return stats;
  };

  const stats = getTotalStats();

  return (
    <div className="fleet-management">
      {/* Header Bar */}
      <div className="fleet-management__header">
        <div className="fleet-management__title">⚔️ Fleet Command Center</div>
        <div className="fleet-management__quick-stats">
          <div className="fleet-management__stat">
            <span className="fleet-management__stat-label">Ships:</span>
            <span className="fleet-management__stat-value">{ships.length}</span>
          </div>
          <div className="fleet-management__stat">
            <span className="fleet-management__stat-label">Attack:</span>
            <span className="fleet-management__stat-value">{stats.totalAttack.toLocaleString()}</span>
          </div>
          <div className="fleet-management__stat">
            <span className="fleet-management__stat-label">Defense:</span>
            <span className="fleet-management__stat-value">{stats.totalDefense.toLocaleString()}</span>
          </div>
          <div className="fleet-management__stat">
            <span className="fleet-management__stat-label">Shield:</span>
            <span className="fleet-management__stat-value">{stats.totalShield.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="fleet-management__grid">
        {/* Left Column: Fleet List & Details */}
        <div className="fleet-management__left">
          {/* Fleet List */}
          <div className="fleet-management__panel">
            <div className="fleet-management__panel-title">Current Fleet ({ships.length})</div>
            <div className="fleet-management__fleet-list">
              {ships.length === 0 ? (
                <div className="fleet-management__empty">No ships deployed</div>
              ) : (
                ships.map((ship) => (
                  <div
                    key={ship.id}
                    className={`fleet-management__ship-compact ${selectedShip?.id === ship.id ? "active" : ""}`}
                    onClick={() => setSelectedShip(ship)}
                  >
                    <div className="fleet-management__ship-row">
                      <div className="fleet-management__ship-name">{ship.name}</div>
                      <div className={`fleet-management__ship-status-badge status-${ship.status}`}>
                        {ship.status[0].toUpperCase()}
                      </div>
                    </div>
                    <div className="fleet-management__ship-bars">
                      <div className="fleet-management__bar">
                        <div
                          className="fleet-management__bar-fill"
                          style={{
                            width: `${(ship.hp / ship.hp_max) * 100}%`,
                            background: "#51cf66",
                          }}
                        />
                      </div>
                      <div className="fleet-management__bar">
                        <div
                          className="fleet-management__bar-fill"
                          style={{
                            width: `${(ship.shield / (ship.shield_max || ship.shield * 1.5)) * 100}%`,
                            background: "#20c997",
                          }}
                        />
                      </div>
                    </div>
                    <div className="fleet-management__ship-mini-stats">
                      <span>{ship.attack}⚔️</span>
                      <span>{ship.defense}🛡️</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="fleet-management__panel">
            <div className="fleet-management__panel-title">Actions</div>
            <div className="fleet-management__action-buttons">
              <button
                className="fleet-management__action-btn"
                onClick={() => setActiveTab("builder")}
              >
                🔧 Build
              </button>
              <button
                className="fleet-management__action-btn"
                onClick={() => setActiveTab("scanner")}
              >
                🔍 Scan
              </button>
              <button
                className="fleet-management__action-btn"
                onClick={() => setActiveTab("engagements")}
              >
                💥 Battles
              </button>
            </div>
          </div>
        </div>

        {/* Center Column: Scanner & Details */}
        <div className="fleet-management__center">
          {/* Tactical Scanner - Always Visible */}
          <div className="fleet-management__panel fleet-management__scanner-panel">
            <div className="fleet-management__panel-title">
              🔍 Tactical Scanner
              {scanActive && <span className="fleet-management__scanning">● SCANNING</span>}
            </div>
            <button
              className="fleet-management__scan-btn"
              onClick={handleScan}
              disabled={scanActive}
            >
              {scanActive ? "SCANNING..." : "INITIATE SCAN"}
            </button>

            {nearbyPlayers.length > 0 ? (
              <div className="fleet-management__targets-compact">
                {nearbyPlayers.slice(0, 5).map((target, idx) => {
                  const threat = getThreatLevel(target.distance);
                  return (
                    <div
                      key={target.id}
                      className="fleet-management__target-mini"
                      style={{ borderLeftColor: threat.color }}
                    >
                      <div className="fleet-management__target-mini-header">
                        <span className="fleet-management__target-mini-name">{target.detected_player_name}</span>
                        <span className="fleet-management__threat-badge" style={{ color: threat.color }}>
                          {threat.level}
                        </span>
                      </div>
                      <div className="fleet-management__target-mini-info">
                        <span>{target.distance.toFixed(1)}u</span>
                        <span>{target.ship_count} ships</span>
                      </div>
                      <button className="fleet-management__engage-btn">ENGAGE</button>
                    </div>
                  );
                })}
                {nearbyPlayers.length > 5 && (
                  <div className="fleet-management__targets-more">
                    +{nearbyPlayers.length - 5} more targets
                  </div>
                )}
              </div>
            ) : (
              <div className="fleet-management__empty">No threats detected</div>
            )}
          </div>

          {/* Selected Ship Details */}
          {selectedShip && (
            <div className="fleet-management__panel">
              <div className="fleet-management__panel-title">📊 {selectedShip.name}</div>
              <div className="fleet-management__ship-details-compact">
                <div className="fleet-management__detail-row">
                  <span>Class:</span>
                  <span>{selectedShip.class_name}</span>
                </div>
                <div className="fleet-management__detail-row">
                  <span>Position:</span>
                  <span>({selectedShip.location_x.toFixed(0)}, {selectedShip.location_y.toFixed(0)})</span>
                </div>
                <div className="fleet-management__detail-bar-row">
                  <div className="fleet-management__detail-label">Hull</div>
                  <div className="fleet-management__detail-bar">
                    <div
                      className="fleet-management__detail-bar-fill"
                      style={{ width: `${(selectedShip.hp / selectedShip.hp_max) * 100}%` }}
                    />
                  </div>
                  <span>{Math.round((selectedShip.hp / selectedShip.hp_max) * 100)}%</span>
                </div>
                <div className="fleet-management__detail-bar-row">
                  <div className="fleet-management__detail-label">Shield</div>
                  <div className="fleet-management__detail-bar">
                    <div
                      className="fleet-management__detail-bar-fill"
                      style={{
                        width: `${(selectedShip.shield / (selectedShip.shield_max || selectedShip.shield * 1.5)) * 100}%`,
                        background: "#20c997",
                      }}
                    />
                  </div>
                  <span>{Math.round((selectedShip.shield / (selectedShip.shield_max || selectedShip.shield * 1.5)) * 100)}%</span>
                </div>

                <div className="fleet-management__deploy-section">
                  <div className="fleet-management__panel-subtitle">Deploy Target</div>
                  <input
                    type="number"
                    placeholder="X"
                    value={moveDestX}
                    onChange={(e) => setMoveDestX(e.target.value)}
                    className="fleet-management__input-compact"
                  />
                  <input
                    type="number"
                    placeholder="Y"
                    value={moveDestY}
                    onChange={(e) => setMoveDestY(e.target.value)}
                    className="fleet-management__input-compact"
                  />
                  <button
                    onClick={handleMoveShip}
                    className="fleet-management__deploy-btn"
                  >
                    ➤ Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Builder & Info */}
        <div className="fleet-management__right">
          {/* Builder Tab */}
          {activeTab === "builder" && (
            <div className="fleet-management__panel">
              <div className="fleet-management__panel-title">🔧 Construct Ship</div>
              <input
                type="text"
                value={newShipName}
                onChange={(e) => setNewShipName(e.target.value)}
                placeholder="Ship name"
                className="fleet-management__input-compact"
              />
              <div className="fleet-management__classes-compact">
                {shipClasses.slice(0, 4).map((shipClass) => (
                  <button
                    key={shipClass.id}
                    className={`fleet-management__class-mini ${selectedClass === shipClass.id ? "active" : ""}`}
                    onClick={() => setSelectedClass(shipClass.id)}
                  >
                    <div>{shipClass.class_name}</div>
                    <div className="fleet-management__class-mini-cost">
                      {(shipClass.build_cost / 1000).toFixed(0)}k
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={handleBuildShip}
                disabled={!selectedClass || !newShipName || buildingShip}
                className="fleet-management__build-btn"
              >
                {buildingShip ? "BUILDING..." : "BUILD SHIP"}
              </button>
            </div>
          )}

          {/* Engagements Tab */}
          {activeTab === "engagements" && (
            <div className="fleet-management__panel">
              <div className="fleet-management__panel-title">
                💥 Engagements ({engagements.length})
              </div>
              {engagements.length === 0 ? (
                <div className="fleet-management__empty">No active battles</div>
              ) : (
                <div className="fleet-management__engagements-compact">
                  {engagements.map((engagement) => (
                    <div key={engagement.id} className="fleet-management__engagement-mini">
                      <div className="fleet-management__engagement-row">
                        <span className="fleet-management__engagement-name">{engagement.attacker_name}</span>
                        <span className="fleet-management__vs">VS</span>
                        <span className="fleet-management__engagement-name">{engagement.defender_name}</span>
                      </div>
                      <div className="fleet-management__engagement-status-mini">
                        {engagement.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fleets Tab */}
          {activeTab !== "builder" && activeTab !== "engagements" && (
            <div className="fleet-management__panel">
              <div className="fleet-management__panel-title">⚔️ Formations ({fleets.length})</div>
              {fleets.length === 0 ? (
                <div className="fleet-management__empty">No fleets</div>
              ) : (
                <div className="fleet-management__fleets-compact">
                  {fleets.map((fleet) => (
                    <div key={fleet.id} className="fleet-management__fleet-mini">
                      <div className="fleet-management__fleet-mini-name">{fleet.fleet_name}</div>
                      <div className="fleet-management__fleet-mini-info">
                        <span>{fleet.formation}</span>
                        <span>🚀 {fleet.ship_count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

  // Fetch ships
  useEffect(() => {
    const fetchShips = async () => {
      try {
        const response = await fetch("/api/fleet/ships", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await response.json();
        setShips(data.ships || []);
      } catch (error) {
        console.error("Error fetching ships:", error);
      }
    };

    const fetchClasses = async () => {
      try {
        const response = await fetch("/api/fleet/classes", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await response.json();
        setShipClasses(data.classes || []);
      } catch (error) {
        console.error("Error fetching ship classes:", error);
      }
    };

    const fetchFleets = async () => {
      try {
        const response = await fetch("/api/fleet/fleets", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await response.json();
        setFleets(data.fleets || []);
      } catch (error) {
        console.error("Error fetching fleets:", error);
      }
    };

    const fetchEngagements = async () => {
      try {
        const response = await fetch("/api/fleet/engagements", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await response.json();
        setEngagements(data.engagements || []);
      } catch (error) {
        console.error("Error fetching engagements:", error);
      }
    };

    fetchShips();
    fetchClasses();
    fetchFleets();
    fetchEngagements();

    const interval = setInterval(() => {
      fetchShips();
      fetchEngagements();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleBuildShip = async () => {
    if (!selectedClass || !newShipName) return;

    setBuildingShip(true);
    try {
      const response = await fetch("/api/fleet/build", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          classId: selectedClass,
          shipName: newShipName,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        alert(`Ship '${newShipName}' is being built!`);
        setNewShipName("");
        setSelectedClass(null);
        // Refresh ships
        const shipsResponse = await fetch("/api/fleet/ships", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const shipsData = await shipsResponse.json();
        setShips(shipsData.ships || []);
      }
    } catch (error) {
      console.error("Error building ship:", error);
      alert("Failed to build ship");
    } finally {
      setBuildingShip(false);
    }
  };

  const handleMoveShip = async () => {
    if (!selectedShip || !moveDestX || !moveDestY) return;

    try {
      const response = await fetch("/api/fleet/move", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          shipId: selectedShip.id,
          destX: parseFloat(moveDestX),
          destY: parseFloat(moveDestY),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        alert(`${selectedShip.name} is en route!`);
        setMoveDestX("");
        setMoveDestY("");
      }
    } catch (error) {
      console.error("Error moving ship:", error);
    }
  };

  const handleScan = async () => {
    try {
      const response = await fetch("/api/fleet/nearby", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      setNearbyPlayers(data.nearbyPlayers || []);
      alert(`Found ${data.nearbyPlayers.length} nearby targets`);
    } catch (error) {
      console.error("Error scanning:", error);
    }
  };

  const getThreatLevel = (distance: number): string => {
    if (distance < 20) return "🔴 EXTREME";
    if (distance < 50) return "🟠 HIGH";
    if (distance < 100) return "🟡 MEDIUM";
    return "🟢 LOW";
  };

  return (
    <div className="fleet-management">
      <div className="fleet-management__tabs">
        <button
          className={`fleet-management__tab ${activeTab === "ships" ? "active" : ""}`}
          onClick={() => setActiveTab("ships")}
        >
          🚀 Fleet ({ships.length})
        </button>
        <button
          className={`fleet-management__tab ${activeTab === "builder" ? "active" : ""}`}
          onClick={() => setActiveTab("builder")}
        >
          🔧 Build Ship
        </button>
        <button
          className={`fleet-management__tab ${activeTab === "fleets" ? "active" : ""}`}
          onClick={() => setActiveTab("fleets")}
        >
          ⚔️ Fleets
        </button>
        <button
          className={`fleet-management__tab ${activeTab === "combat" ? "active" : ""}`}
          onClick={() => setActiveTab("combat")}
        >
          💥 Combat
        </button>
      </div>

      {/* Ships Tab */}
      {activeTab === "ships" && (
        <div className="fleet-management__content">
          <div className="fleet-management__grid">
            <div className="fleet-management__list">
              <h3>Your Fleet</h3>
              <div className="fleet-management__ships">
                {ships.length === 0 ? (
                  <p className="fleet-management__empty">No ships yet. Build one to get started!</p>
                ) : (
                  ships.map((ship) => (
                    <div
                      key={ship.id}
                      className={`fleet-management__ship-item ${selectedShip?.id === ship.id ? "active" : ""}`}
                      onClick={() => setSelectedShip(ship)}
                    >
                      <div className="fleet-management__ship-name">{ship.name}</div>
                      <div className="fleet-management__ship-class">{ship.class_name || "Unknown"}</div>
                      <div className="fleet-management__ship-status" style={{ color: ship.status === "combat" ? "#ff6b6b" : ship.status === "moving" ? "#20c997" : "#868e96" }}>
                        {ship.status.toUpperCase()}
                      </div>
                      <div className="fleet-management__ship-hp">
                        HP: {ship.hp}/{ship.hp_max}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedShip && (
              <div className="fleet-management__details">
                <h3>Ship Details: {selectedShip.name}</h3>
                <div className="fleet-management__stat-row">
                  <span>Class:</span>
                  <span className="fleet-management__stat-value">{selectedShip.class_name}</span>
                </div>
                <div className="fleet-management__stat-row">
                  <span>Status:</span>
                  <span className="fleet-management__stat-value">{selectedShip.status}</span>
                </div>
                <div className="fleet-management__stat-row">
                  <span>Location:</span>
                  <span className="fleet-management__stat-value">({selectedShip.location_x.toFixed(1)}, {selectedShip.location_y.toFixed(1)})</span>
                </div>
                <div className="fleet-management__stat-row">
                  <span>Hull Strength:</span>
                  <span className="fleet-management__stat-value">{selectedShip.hp}/{selectedShip.hp_max}</span>
                </div>
                <div className="fleet-management__stat-row">
                  <span>Shield:</span>
                  <span className="fleet-management__stat-value">{selectedShip.shield}/{selectedShip.shield_max}</span>
                </div>
                <div className="fleet-management__stat-row">
                  <span>Attack Power:</span>
                  <span className="fleet-management__stat-value">{selectedShip.attack}</span>
                </div>
                <div className="fleet-management__stat-row">
                  <span>Defense:</span>
                  <span className="fleet-management__stat-value">{selectedShip.defense}</span>
                </div>
                <div className="fleet-management__stat-row">
                  <span>Crew:</span>
                  <span className="fleet-management__stat-value">{selectedShip.crew_count}</span>
                </div>

                <div className="fleet-management__actions">
                  <div className="fleet-management__move-section">
                    <h4>Deploy Ship</h4>
                    <input
                      type="number"
                      placeholder="Dest X"
                      value={moveDestX}
                      onChange={(e) => setMoveDestX(e.target.value)}
                      className="fleet-management__input"
                    />
                    <input
                      type="number"
                      placeholder="Dest Y"
                      value={moveDestY}
                      onChange={(e) => setMoveDestY(e.target.value)}
                      className="fleet-management__input"
                    />
                    <button onClick={handleMoveShip} className="fleet-management__btn fleet-management__btn--move">
                      Send to Location
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Build Ship Tab */}
      {activeTab === "builder" && (
        <div className="fleet-management__content">
          <div className="fleet-management__builder">
            <h3>Construct New Ship</h3>
            <div className="fleet-management__builder-form">
              <div className="fleet-management__form-group">
                <label>Ship Name:</label>
                <input
                  type="text"
                  value={newShipName}
                  onChange={(e) => setNewShipName(e.target.value)}
                  placeholder="e.g., Mazer Strike, Graff Command"
                  className="fleet-management__input"
                />
              </div>

              <div className="fleet-management__form-group">
                <label>Ship Class:</label>
                <div className="fleet-management__classes">
                  {shipClasses.map((shipClass) => (
                    <button
                      key={shipClass.id}
                      className={`fleet-management__class-card ${selectedClass === shipClass.id ? "active" : ""}`}
                      onClick={() => setSelectedClass(shipClass.id)}
                    >
                      <div className="fleet-management__class-name">{shipClass.class_name}</div>
                      <div className="fleet-management__class-stats">
                        <div>⚔️ {shipClass.base_attack}</div>
                        <div>🛡️ {shipClass.base_defense}</div>
                        <div>⚡ {shipClass.base_shield}</div>
                      </div>
                      <div className="fleet-management__class-cost">
                        {shipClass.build_cost.toLocaleString()} credits
                      </div>
                      <div className="fleet-management__class-time">
                        ⏱️ {shipClass.build_time_minutes} min
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleBuildShip}
                disabled={!selectedClass || !newShipName || buildingShip}
                className="fleet-management__btn fleet-management__btn--build"
              >
                {buildingShip ? "Building..." : "Build Ship"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fleets Tab */}
      {activeTab !== "builder" && activeTab !== "engagements" && (
        <div className="fleet-management__panel">
          <div className="fleet-management__panel-title">⚔️ Formations ({fleets.length})</div>
          {fleets.length === 0 ? (
            <div className="fleet-management__empty">No fleets</div>
          ) : (
            <div className="fleet-management__fleets-compact">
              {fleets.map((fleet) => (
                <div key={fleet.id} className="fleet-management__fleet-mini">
                  <div className="fleet-management__fleet-mini-name">{fleet.fleet_name}</div>
                  <div className="fleet-management__fleet-mini-info">
                    <span>{fleet.formation}</span>
                    <span>🚀 {fleet.ship_count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
