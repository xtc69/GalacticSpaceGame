import type { MarketEntry } from "../api/client";
import "./EconomyPanel.css";

interface EconomyPanelProps {
  market: MarketEntry[];
}

export function EconomyPanel({ market }: EconomyPanelProps) {
  return (
    <div className="economy">
      <h2>World Economy</h2>
      <table className="economy__table">
        <thead>
          <tr>
            <th>Resource</th>
            <th>Price</th>
            <th>24h Change</th>
            <th>Supply</th>
          </tr>
        </thead>
        <tbody>
          {market.map((entry) => (
            <tr key={entry.resource}>
              <td>{entry.resource}</td>
              <td>{entry.price.toLocaleString(undefined, { maximumFractionDigits: 2 })} cr</td>
              <td className={entry.change >= 0 ? "economy__change--up" : "economy__change--down"}>
                {entry.change >= 0 ? "▲" : "▼"} {Math.abs(entry.change).toFixed(2)}
              </td>
              <td>{entry.supply}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
