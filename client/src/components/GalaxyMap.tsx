import { useMemo, useState } from "react";
import type { Ship } from "../api/client";
import "./GalaxyMap.css";

export interface Planet {
  id: number;
  name: string;
  x: number;
  y: number;
  type: "mining" | "forge" | "archive" | "frontier";
  resource: string;
  level: number;
  controlled: boolean;
  tier: "safe" | "medium" | "hardcore";
  activity: "PvE" | "PvP" | "PvE / PvP";
}

interface Galaxy {
  id: number;
  name: string;
  x: number;
  y: number;
  type: Planet["type"];
  controlled: boolean;
}

interface GalaxyMapProps {
  ships: Ship[];
  selectedShipId: string | null;
  onSelectShip: (id: string) => void;
}

const PLANET_TYPES: Planet["type"][] = ["mining", "forge", "archive", "frontier"];
const RESOURCES = ["Titanium", "Helium-3", "Crystals", "Dark matter"];
const TYPE_LABELS: Record<Planet["type"], string> = {
  mining: "Mining world",
  forge: "Industrial forge",
  archive: "Research archive",
  frontier: "Frontier outpost",
};

function createGalaxies(): Galaxy[] {
  return Array.from({ length: 50 }, (_, index) => {
    const angle = index * 2.39996;
    const radius = 8 + ((index * 17) % 38);
    return {
      id: index + 1,
      name: `Galaxy ${String(index + 1).padStart(2, "0")}`,
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius * 0.72,
      type: PLANET_TYPES[index % PLANET_TYPES.length],
      controlled: index === 0 || index === 7,
    };
  });
}

function createPlanets(galaxyId: number): Planet[] {
  return Array.from({ length: 10 }, (_, index) => {
    const angle = index * 2.39996;
    const radius = 12 + ((index * 11) % 29);
    const seed = (galaxyId - 1) * 10 + index;
    return {
      id: index + 1,
      name: `Planet ${String(index + 1).padStart(2, "0")}`,
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius * 0.72,
      type: PLANET_TYPES[seed % PLANET_TYPES.length],
      resource: RESOURCES[seed % RESOURCES.length],
      level: (seed % 5) + 1,
      controlled: galaxyId === 1 && (index === 0 || index === 7),
      tier: seed % 7 === 0 ? "hardcore" : seed % 3 === 0 ? "medium" : "safe",
      activity: seed % 7 === 0 ? "PvP" : seed % 3 === 0 ? "PvE / PvP" : "PvE",
    };
  });
}

export function GalaxyMap({ ships, selectedShipId, onSelectShip }: GalaxyMapProps) {
  const galaxies = useMemo(createGalaxies, []);
  const [selectedGalaxy, setSelectedGalaxy] = useState<Galaxy | null>(null);
  const planets = useMemo(() => selectedGalaxy ? createPlanets(selectedGalaxy.id) : [], [selectedGalaxy]);
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
  const [shipPositions, setShipPositions] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState("Sector map synchronized");
  const [rotation, setRotation] = useState({ x: 14, y: -18 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number; rotationX: number; rotationY: number } | null>(null);

  const selectedShip = ships.find((ship) => ship.id === selectedShipId) ?? ships[0];
  const shipPosition = selectedGalaxy && selectedShip
    ? planets[shipPositions[selectedShip.id] ?? planets.findIndex((planet) => planet.name === selectedShip.location)] ?? planets[0]
    : null;

  function projectMarker(marker: Pick<Galaxy, "id" | "x" | "y">) {
    const radiansX = rotation.x * Math.PI / 180;
    const radiansY = rotation.y * Math.PI / 180;
    const baseX = marker.x - 50;
    const baseY = marker.y - 50;
    const depth = Math.sin(marker.id * 2.39996) * 24;
    const yawX = baseX * Math.cos(radiansY) + depth * Math.sin(radiansY);
    const yawDepth = depth * Math.cos(radiansY) - baseX * Math.sin(radiansY);
    const projectedY = baseY * Math.cos(radiansX) - yawDepth * Math.sin(radiansX);
    const projectedDepth = baseY * Math.sin(radiansX) + yawDepth * Math.cos(radiansX);
    return {
      left: 50 + yawX,
      top: 50 + projectedY,
      scale: 0.72 + (projectedDepth + 38) / 110,
      opacity: 0.55 + (projectedDepth + 38) / 140,
      depth: Math.round(projectedDepth),
    };
  }

  function rotateWithWheel(event: React.WheelEvent<HTMLElement>) {
    event.preventDefault();
    setRotation((current) => ({ ...current, y: current.y + event.deltaY * 0.18 }));
  }

  function startOrbit(event: React.PointerEvent<HTMLElement>) {
    setDragStart({ x: event.clientX, y: event.clientY, rotationX: rotation.x, rotationY: rotation.y });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function orbit(event: React.PointerEvent<HTMLElement>) {
    if (!dragStart) return;
    setRotation({ x: dragStart.rotationX - (event.clientY - dragStart.y) * 0.2, y: dragStart.rotationY + (event.clientX - dragStart.x) * 0.2 });
  }

  function runAction(action: string) {
    setNotice(`${action} queued for ${selectedPlanet?.name ?? "selected world"}`);
  }

  function moveSelectedShip() {
    if (!selectedShip || !selectedPlanet) return;
    setShipPositions((positions) => ({ ...positions, [selectedShip.id]: selectedPlanet.id - 1 }));
    setNotice(`${selectedShip.name} en route to ${selectedPlanet.name}`);
  }

  function enterGalaxy(galaxy: Galaxy) {
    setSelectedGalaxy(galaxy);
    setSelectedPlanet(null);
    setNotice(`${galaxy.name} navigation map opened`);
  }

  function leaveGalaxy() {
    setSelectedGalaxy(null);
    setSelectedPlanet(null);
    setNotice("Galaxy index synchronized");
  }

  return (
    <section className="galaxy-map" aria-label="Galaxy map" onWheel={rotateWithWheel} onPointerDown={startOrbit} onPointerMove={orbit} onPointerUp={() => setDragStart(null)}>
      <div className="galaxy-map__grid" />
      <div className="galaxy-map__nebula galaxy-map__nebula--cyan" />
      <div className="galaxy-map__nebula galaxy-map__nebula--amber" />
      <div className="galaxy-map__header">
        <div>
          <div className="galaxy-map__eyebrow">Orion sector / live navigation</div>
          <h1>{selectedGalaxy?.name ?? "Galactic frontier"}</h1>
          <p>{selectedGalaxy ? "10 planets discovered · select a planet to inspect it" : "50 discovered galaxies · select a galaxy to navigate inside"}</p>
        </div>
        <div className="galaxy-map__telemetry">
          <span><i className="telemetry-dot telemetry-dot--green" /> {selectedGalaxy ? planets.filter((planet) => planet.controlled).length : galaxies.filter((galaxy) => galaxy.controlled).length} controlled</span>
          <span><i className="telemetry-dot telemetry-dot--cyan" /> {ships.length || 0} ships online</span>
          <span><i className="telemetry-dot telemetry-dot--amber" /> yaw {Math.round(rotation.y)}°</span>
        </div>
      </div>

      {selectedGalaxy && <button className="galaxy-map__back" onClick={leaveGalaxy}>Back to galaxies</button>}

      <div className="galaxy-map__routes" aria-hidden="true">
        <span className="route route--one" />
        <span className="route route--two" />
        <span className="route route--three" />
      </div>

      <div className="galaxy-map__planets">
        {(selectedGalaxy ? planets : galaxies).map((marker) => (
          <button
            key={marker.id}
            className={`planet planet--${marker.type} ${selectedGalaxy && selectedPlanet?.id === marker.id ? "planet--selected" : ""} ${marker.controlled ? "planet--controlled" : ""}`}
            style={{ left: `${projectMarker(marker).left}%`, top: `${projectMarker(marker).top}%`, zIndex: projectMarker(marker).depth + 50, opacity: projectMarker(marker).opacity, "--planet-scale": projectMarker(marker).scale } as React.CSSProperties}
            onClick={() => selectedGalaxy ? setSelectedPlanet(marker) : enterGalaxy(marker)}
            title={selectedGalaxy ? `${marker.name} - ${TYPE_LABELS[marker.type]}` : `${marker.name} - 10 planets`}
          >
            <span className="planet__orb" />
            <span className="planet__label">{marker.name}</span>
          </button>
        ))}
        {shipPosition && (
          <div className="ship-marker" style={{ left: `${projectMarker(shipPosition).left}%`, top: `${projectMarker(shipPosition).top - 5}%`, zIndex: projectMarker(shipPosition).depth + 51 }}>
            <span className="ship-marker__icon">+</span>
            <span>{selectedShip.name}</span>
          </div>
        )}
      </div>

      <div className="galaxy-map__legend">
        {PLANET_TYPES.map((type) => <span key={type}><i className={`legend-dot legend-dot--${type}`} /> {type}</span>)}
      </div>

      {selectedPlanet && (
        <aside className="planet-panel">
          <button className="planet-panel__close" onClick={() => setSelectedPlanet(null)} aria-label="Close planet details">x</button>
          <div className={`planet-panel__sigil planet-panel__sigil--${selectedPlanet.type}`}>{String(selectedPlanet.id).padStart(2, "0")}</div>
          <div className="planet-panel__eyebrow">World profile / {selectedPlanet.type}</div>
          <h2>{selectedPlanet.name}</h2>
          <p className="planet-panel__type">{TYPE_LABELS[selectedPlanet.type]} · Level {selectedPlanet.level}</p>
          <div className={`planet-panel__tier planet-panel__tier--${selectedPlanet.tier}`}><span>{selectedPlanet.tier} tier</span><strong>{selectedPlanet.activity}</strong></div>
          <div className="planet-panel__resource"><span>Primary resource</span><strong>{selectedPlanet.resource}</strong></div>
          <div className="planet-panel__status"><span className="status-pulse" /> {selectedPlanet.controlled ? "Under your control" : "Unclaimed territory"}</div>
          <div className="planet-panel__actions">
            <button onClick={moveSelectedShip}>Move here</button>
            <button onClick={() => runAction("Mining operation")}>Mine</button>
            <button onClick={() => runAction("Construction order")}>Build</button>
            <button onClick={() => runAction("Control claim")}>{selectedPlanet.controlled ? "Manage" : "Claim"}</button>
          </div>
          <div className="planet-panel__footer">{notice}</div>
        </aside>
      )}

      <div className="galaxy-map__controls">
        <span>Wheel orbit · drag to rotate</span>
        <button aria-label="Zoom out">-</button>
        <button aria-label="Zoom in">+</button>
      </div>

      <div className="ship-dock">
        <div className="ship-dock__heading"><span>Your fleet</span><span>{ships.length} vessels</span></div>
        <div className="ship-dock__ships">
          {ships.slice(0, 4).map((ship) => (
            <button key={ship.id} className={selectedShipId === ship.id ? "ship-card ship-card--selected" : "ship-card"} onClick={() => onSelectShip(ship.id)}>
              <span className="ship-card__icon">{ship.status === "combat" ? "!" : "+"}</span>
              <span><strong>{ship.name}</strong><small>{ship.status} / {ship.location}</small></span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
