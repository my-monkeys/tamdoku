import { byId, linesFor } from "../data.ts";
import { todayStr } from "../format.ts";

/**
 * Légende : les couleurs = les lignes du réseau (pas l'originalité). Datée, pour
 * qu'une grille d'archive n'annonce pas une ligne ouverte depuis.
 */
export function LineLegend({
  caption = "= les lignes du réseau",
  date = todayStr(),
}: {
  caption?: string;
  date?: string;
}) {
  return (
    <div className="linelegend">
      {linesFor(date).map((ref) => (
        <span key={ref} className={`ll v${ref}`}>
          {ref}
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
