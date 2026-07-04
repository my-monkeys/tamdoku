import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Network } from "./types.ts";

export { metersBetween } from "./geo.ts";
export { stationById } from "./select.ts";

const DEFAULT_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "network.json");

/** Charge le réseau depuis le disque (Node uniquement). Côté navigateur, importer
 * directement `data/network.json` et passer l'objet aux fonctions de l'engine. */
export function loadNetwork(path: string = DEFAULT_PATH): Network {
  return JSON.parse(readFileSync(path, "utf8")) as Network;
}
