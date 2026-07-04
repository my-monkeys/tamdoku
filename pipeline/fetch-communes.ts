/**
 * Résout la commune de chaque arrêt via geo.api.gouv.fr (point → commune).
 * Clé de sortie : nom d'arrêt OSM normalisé (espaces), une entrée par nom unique.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const rawDir = join(ROOT, "data", "raw");

interface OsmNode {
  type: string;
  lat: number;
  lon: number;
  tags?: { name?: string };
}

const osm = JSON.parse(readFileSync(join(rawDir, "osm-tram.json"), "utf8")) as {
  elements: OsmNode[];
};

const byName = new Map<string, { lat: number; lon: number }>();
for (const el of osm.elements) {
  if (el.type !== "node") continue;
  const name = el.tags?.name?.replace(/\s+/g, " ").trim();
  if (name && !byName.has(name)) byName.set(name, { lat: el.lat, lon: el.lon });
}

const communes: Record<string, string> = {};
for (const [name, { lat, lon }] of byName) {
  const url = `https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lon}&fields=nom`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`geo.api.gouv.fr ${res.status} pour ${name}`);
  const arr = (await res.json()) as { nom: string }[];
  const commune = arr[0]?.nom;
  if (!commune) throw new Error(`Pas de commune pour ${name} (${lat},${lon})`);
  communes[name] = commune;
  await new Promise((r) => setTimeout(r, 60));
}

writeFileSync(join(rawDir, "communes.json"), JSON.stringify(communes, null, 1));
const counts: Record<string, number> = {};
for (const c of Object.values(communes)) counts[c] = (counts[c] ?? 0) + 1;
console.log("OK → data/raw/communes.json");
console.log(counts);
