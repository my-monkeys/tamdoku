/**
 * Télécharge le GTFS officiel TaM (open data Montpellier Méditerranée Métropole)
 * et en extrait les stations de tramway avec, pour chaque paire station×ligne,
 * le nombre de courses — ce qui permet au build de distinguer la desserte
 * nominale des variantes exceptionnelles (déviations travaux présentes dans le GTFS).
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "./gtfs-csv.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GTFS_URL = "https://data.montpellier3m.fr/sites/default/files/ressources/TAM_MMM_GTFS.zip";

const rawDir = join(ROOT, "data", "raw");
const zipPath = join(rawDir, "tam-gtfs.zip");
const gtfsDir = join(rawDir, "gtfs");
mkdirSync(gtfsDir, { recursive: true });

if (!existsSync(zipPath)) {
  console.log("Téléchargement du GTFS TaM…");
  const res = await fetch(GTFS_URL);
  if (!res.ok) throw new Error(`GTFS ${res.status}`);
  writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));
}
execSync(`unzip -o -q ${JSON.stringify(zipPath)} -d ${JSON.stringify(gtfsDir)}`);

const read = (f: string) => parseCsv(readFileSync(join(gtfsDir, f), "utf8"));

const tramRoutes = new Map(
  read("routes.txt")
    .filter((r) => r["route_type"] === "0")
    .map((r) => [
      r["route_id"]!,
      { ref: r["route_short_name"]!, longName: r["route_long_name"]!, color: r["route_color"]! },
    ]),
);

const tripLine = new Map<string, string>();
for (const t of read("trips.txt")) {
  const route = tramRoutes.get(t["route_id"]!);
  if (route) tripLine.set(t["trip_id"]!, route.ref);
}

const stopName = new Map(read("stops.txt").map((s) => [s["stop_id"]!, s["stop_name"]!]));

// tripCounts[nom station][ligne] = nb de courses qui s'y arrêtent
const tripCounts: Record<string, Record<string, number>> = {};
const lineTotals: Record<string, Set<string>> = {};
for (const st of read("stop_times.txt")) {
  const line = tripLine.get(st["trip_id"]!);
  if (!line) continue;
  const name = stopName.get(st["stop_id"]!)?.replace(/\s+/g, " ").trim();
  if (!name) continue;
  (tripCounts[name] ??= {})[line] = (tripCounts[name]![line] ?? 0) + 1;
  (lineTotals[line] ??= new Set()).add(st["trip_id"]!);
}

const output = {
  fetchedAt: new Date().toISOString(),
  routes: Object.fromEntries([...tramRoutes.values()].map((r) => [r.ref, r])),
  lineTripTotals: Object.fromEntries(
    Object.entries(lineTotals).map(([ref, trips]) => [ref, trips.size]),
  ),
  stations: tripCounts,
};
writeFileSync(join(rawDir, "gtfs-tram.json"), JSON.stringify(output, null, 1));
console.log(
  `OK → data/raw/gtfs-tram.json (${Object.keys(tripCounts).length} stations, lignes: ${[...tramRoutes.values()].map((r) => r.ref).join(", ")})`,
);
