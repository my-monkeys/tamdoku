import type { CSSProperties } from "react";
import type { Criterion } from "../../engine/criteria.ts";
import { byId } from "../data.ts";

/** Pastille ronde d'une ligne (numéro coloré) ou d'un attribut (icône sur fond doux). */
export function Rd({
  crit,
  className = "rd mini",
  style,
}: {
  crit: Criterion;
  className?: string;
  style?: CSSProperties;
}) {
  if (crit.kind === "line") {
    return (
      <span className={`${className} ${crit.valClass}`} style={style}>
        {crit.n}
      </span>
    );
  }
  return (
    <span
      className={className}
      style={{ background: "var(--soft)", color: "var(--ink)", ...style }}
    >
      {crit.icon}
    </span>
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
