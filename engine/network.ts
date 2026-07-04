import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Network, Station } from "./types.ts";

const DEFAULT_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "network.json");

export function loadNetwork(path: string = DEFAULT_PATH): Network {
  return JSON.parse(readFileSync(path, "utf8")) as Network;
}

export function stationById(net: Network): Map<string, Station> {
  return new Map(net.stations.map((s) => [s.id, s]));
}

/** Distance à vol d'oiseau en mètres (approximation plane, suffisante à l'échelle de la métropole). */
export function metersBetween(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const dx = (a.lon - b.lon) * Math.cos((a.lat * Math.PI) / 180) * 111_320;
  const dy = (a.lat - b.lat) * 111_320;
  return Math.hypot(dx, dy);
}
