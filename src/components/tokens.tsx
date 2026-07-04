import { byId } from "../data.ts";

/** Légende : les 5 couleurs = les lignes de tram (pas l'originalité). */
export function LineLegend({ caption = "= les lignes de tram" }: { caption?: string }) {
  return (
    <div className="linelegend">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`ll v${n}`}>
          {n}
        </span>
      ))}
      <span className="ll-cap">{caption}</span>
    </div>
  );
}

/** Les points colorés des lignes desservant une station (sous son nom). */
export function LineDots({ stationId }: { stationId: string }) {
  const station = byId.get(stationId);
  if (!station) return null;
  return (
    <span className="ldots">
      {station.lines.map((line) => (
        <span key={line} className={`ldot v${line}`} />
      ))}
    </span>
  );
}
