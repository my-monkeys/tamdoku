/** Sélecteurs purs sur un réseau (browser-safe, aucune dépendance Node). */
import type { Network, Station } from "./types.ts";

export function stationById(net: Network): Map<string, Station> {
  return new Map(net.stations.map((s) => [s.id, s]));
}

/**
 * Réseau en vigueur à une date : les lignes pas encore entrées dans le jeu
 * (`Line.since` postérieur) en sont retirées, avec les stations qu'elles sont
 * seules à desservir. C'est ce qui permet d'étendre le réseau sans réécrire les
 * grilles déjà tirées — le catalogue de règles d'une date passée est reconstruit
 * sur le réseau de cette date, à l'identique.
 *
 * "" (entraînement, hors calendrier) = réseau complet.
 */
export function networkFor(net: Network, date: string): Network {
  if (!date) return net;
  const future = new Set(net.lines.filter((l) => l.since && l.since > date).map((l) => l.ref));
  if (future.size === 0) return net;
  return {
    ...net,
    lines: net.lines.filter((l) => !future.has(l.ref)),
    stations: net.stations
      .map((s) => ({
        ...s,
        lines: s.lines.filter((ref) => !future.has(ref)),
        terminusOf: s.terminusOf.filter((ref) => !future.has(ref)),
      }))
      .filter((s) => s.lines.length > 0),
  };
}
