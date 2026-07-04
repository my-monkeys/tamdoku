/** Sélecteurs purs sur un réseau (browser-safe, aucune dépendance Node). */
import type { Network, Station } from "./types.ts";

export function stationById(net: Network): Map<string, Station> {
  return new Map(net.stations.map((s) => [s.id, s]));
}
