/**
 * Construit data/network.json à partir des snapshots bruts :
 *  - topologie et desserte nominale : relations OSM (les variantes travaux du GTFS sont ignorées),
 *  - identité et alias des stations : GTFS officiel + curation,
 *  - communes : geo.api.gouv.fr, P+Tram : parkings park_ride OSM à moins de 300 m.
 * Un rapport de croisement OSM/GTFS est affiché en console : toute divergence doit
 * être expliquée (déviation travaux) ou corrigée via pipeline/curation.json.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fold, slugify } from "../engine/text.ts";
import type { Line, LineRef, Network, Station } from "../engine/types.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const rawDir = join(ROOT, "data", "raw");
const readJson = (p: string) => JSON.parse(readFileSync(p, "utf8"));

interface Curation {
  merges: Record<string, string>;
  renames: Record<string, string>;
  gtfsAliases: Record<string, string>;
  parkRideOverrides: Record<string, boolean>;
  tags: Record<string, string[]>;
}
const curation = readJson(join(ROOT, "pipeline", "curation.json")) as Curation;
const osm = readJson(join(rawDir, "osm-tram.json"));
const parkRideRaw = readJson(join(rawDir, "osm-parkride.json"));
const gtfs = readJson(join(rawDir, "gtfs-tram.json"));
const communes = readJson(join(rawDir, "communes.json")) as Record<string, string>;

const cleanupName = (name: string) => name.replace(/\s+/g, " ").trim();
const canonicalize = (rawName: string): string => {
  const name = cleanupName(rawName);
  return curation.merges[name] ?? curation.renames[name] ?? name;
};
/** Clé de rapprochement inter-sources : pliée, alphanumérique seulement. */
const matchKey = (name: string) => fold(name).replace(/[^a-z0-9]/g, "");

// ── Stations et branches depuis les relations OSM ────────────────────────────
const nodes = new Map<number, { lat: number; lon: number; name?: string }>();
for (const el of osm.elements) {
  if (el.type === "node") nodes.set(el.id, { lat: el.lat, lon: el.lon, name: el.tags?.name });
}

interface Acc {
  name: string;
  rawNames: Set<string>;
  lines: Set<LineRef>;
  coords: { lat: number; lon: number }[];
}
const stations = new Map<string, Acc>();
const lineBranches = new Map<LineRef, string[][]>();
const lineColors: Record<string, string> = {};

for (const rel of osm.elements) {
  if (rel.type !== "relation") continue;
  const rawRef: string = rel.tags.ref;
  const ref = rawRef[0] as LineRef; // "4A"/"4B" → "4"
  const sequence: string[] = [];
  for (const member of rel.members) {
    if (member.type !== "node" || !member.role.startsWith("stop")) continue;
    const node = nodes.get(member.ref);
    if (!node?.name) continue;
    const rawName = cleanupName(node.name);
    const name = canonicalize(rawName);
    const acc = stations.get(name) ?? {
      name,
      rawNames: new Set<string>(),
      lines: new Set<LineRef>(),
      coords: [],
    };
    acc.rawNames.add(rawName);
    acc.lines.add(ref);
    acc.coords.push({ lat: node.lat, lon: node.lon });
    stations.set(name, acc);
    if (sequence[sequence.length - 1] !== name) sequence.push(name);
  }
  const branches = lineBranches.get(ref) ?? [];
  const reversed = [...sequence].reverse();
  const isReverseOfKnown = branches.some(
    (b) => b.length === reversed.length && b.every((s, i) => s === reversed[i]),
  );
  if (!isReverseOfKnown) branches.push(sequence);
  lineBranches.set(ref, branches);
}

// ── Alias GTFS et croisement de la desserte ──────────────────────────────────
const byMatchKey = new Map<string, Acc>();
for (const acc of stations.values()) byMatchKey.set(matchKey(acc.name), acc);

const gtfsAliasByStation = new Map<string, string>();
const gtfsLinesByStation = new Map<string, Set<string>>();
const DEVIATION_THRESHOLD = 0.1; // paire station×ligne < 10 % des courses = variante exceptionnelle
for (const [gtfsName, lineCounts] of Object.entries(
  gtfs.stations as Record<string, Record<string, number>>,
)) {
  const canonical = curation.gtfsAliases[gtfsName] ?? gtfsName;
  const acc = stations.get(canonical) ?? byMatchKey.get(matchKey(canonical));
  if (!acc) {
    console.warn(`⚠ Station GTFS sans équivalent OSM : « ${gtfsName} »`);
    continue;
  }
  if (gtfsName !== acc.name) gtfsAliasByStation.set(acc.name, gtfsName);
  const significant = new Set<string>();
  for (const [line, count] of Object.entries(lineCounts)) {
    if (count / gtfs.lineTripTotals[line] >= DEVIATION_THRESHOLD) significant.add(line);
  }
  gtfsLinesByStation.set(acc.name, significant);
}

console.log("── Croisement desserte OSM ↔ GTFS (hors variantes < 10 % des courses) ──");
let diffCount = 0;
for (const acc of stations.values()) {
  const gtfsLines = gtfsLinesByStation.get(acc.name);
  if (!gtfsLines) {
    console.warn(`⚠ ${acc.name} : absente du GTFS`);
    diffCount++;
    continue;
  }
  const osmLines = [...acc.lines].sort().join(",");
  const gtfsSorted = [...gtfsLines].sort().join(",");
  if (osmLines !== gtfsSorted) {
    console.warn(`⚠ ${acc.name} : OSM {${osmLines}} ≠ GTFS {${gtfsSorted}}`);
    diffCount++;
  }
}
console.log(diffCount === 0 ? "✓ Aucune divergence" : `${diffCount} divergence(s) à examiner`);

// ── Terminus, P+Tram, communes, tags ─────────────────────────────────────────
// Ligne classique : les deux extrémités de chaque branche. Ligne circulaire (L4) :
// l'origine de la boucle, qui est bien un terminus (Garcia Lorca, départ/arrivée
// des deux sens 4A/4B) même si la ligne fait le tour de l'Écusson.
const terminusOf = new Map<string, Set<LineRef>>();
for (const [ref, branches] of lineBranches) {
  const circular = ref === "4";
  for (const branch of branches) {
    const ends = circular ? [branch[0]] : [branch[0], branch[branch.length - 1]];
    for (const name of ends) {
      if (!name) continue;
      (terminusOf.get(name) ?? terminusOf.set(name, new Set()).get(name)!).add(ref);
    }
  }
}

const parkRideSpots: { lat: number; lon: number }[] = [];
for (const el of parkRideRaw.elements) {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat !== undefined && lon !== undefined) parkRideSpots.push({ lat, lon });
}
const metersBetween = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const dx = (a.lon - b.lon) * Math.cos((a.lat * Math.PI) / 180) * 111_320;
  const dy = (a.lat - b.lat) * 111_320;
  return Math.hypot(dx, dy);
};

const tagsBySlug = new Map<string, string[]>();
for (const [tag, slugs] of Object.entries(curation.tags)) {
  for (const slug of slugs) {
    if (slug.startsWith("_")) continue;
    tagsBySlug.set(slug, [...(tagsBySlug.get(slug) ?? []), tag]);
  }
}

// ── Assemblage ────────────────────────────────────────────────────────────────
const stationList: Station[] = [...stations.values()]
  .sort((a, b) => a.name.localeCompare(b.name, "fr"))
  .map((acc) => {
    const id = slugify(acc.name);
    const lat = acc.coords.reduce((s, c) => s + c.lat, 0) / acc.coords.length;
    const lon = acc.coords.reduce((s, c) => s + c.lon, 0) / acc.coords.length;
    const commune = [...acc.rawNames].map((n) => communes[n]).find(Boolean);
    if (!commune) throw new Error(`Commune inconnue pour ${acc.name}`);
    const aliases = new Set<string>();
    for (const raw of acc.rawNames) if (raw !== acc.name) aliases.add(raw);
    const gtfsAlias = gtfsAliasByStation.get(acc.name);
    if (gtfsAlias) aliases.add(gtfsAlias);
    // Alias court automatique : préfixe avant « - » ou « ( » (« Louis Blanc » pour
    // « Louis Blanc - Agora de la Danse »), seulement si aucune autre station ne
    // commence pareil — « Albert 1er » ou « Gare Saint-Roch » restent ambigus.
    const prefix = acc.name.split(/ - | \(/)[0]!.trim();
    if (prefix !== acc.name) {
      const prefixKey = matchKey(prefix);
      const ambiguous = [...stations.keys()].some(
        (other) => other !== acc.name && matchKey(other).startsWith(prefixKey),
      );
      if (!ambiguous) aliases.add(prefix);
    }
    const nearParkRide = parkRideSpots.some((p) => metersBetween(p, { lat, lon }) <= 300);
    return {
      id,
      name: acc.name,
      aliases: [...aliases].sort(),
      lines: [...acc.lines].sort() as LineRef[],
      lat: Number(lat.toFixed(6)),
      lon: Number(lon.toFixed(6)),
      commune,
      terminusOf: [...(terminusOf.get(acc.name) ?? [])].sort() as LineRef[],
      parkRide: curation.parkRideOverrides[id] ?? nearParkRide,
      tags: tagsBySlug.get(id) ?? [],
    };
  });

const idByName = new Map(stationList.map((s) => [s.name, s.id]));
const lineList: Line[] = [...lineBranches.keys()].sort().map((ref) => {
  const branches = lineBranches
    .get(ref)!
    .map((branch) => branch.map((name) => idByName.get(name)!));
  const circular = ref === "4";
  // Circulaire : origine de la boucle (Garcia Lorca). Sinon : les deux bouts.
  const ends = circular
    ? branches.map((b) => b[0]!)
    : branches.flatMap((b) => [b[0]!, b[b.length - 1]!]);
  const termini = [...new Set(ends)].sort();
  return {
    ref,
    name: gtfs.routes[ref]?.longName ?? `Ligne ${ref}`,
    color: `#${gtfs.routes[ref]?.color ?? "888888"}`,
    circular,
    termini,
    branches,
  };
});

// Slugs de curation inconnus = typo → erreur dure
for (const slug of tagsBySlug.keys()) {
  if (!stationList.some((s) => s.id === slug)) throw new Error(`Tag sur slug inconnu : ${slug}`);
}
for (const slug of Object.keys(curation.parkRideOverrides)) {
  if (slug.startsWith("_")) continue;
  if (!stationList.some((s) => s.id === slug)) throw new Error(`Override P+R inconnu : ${slug}`);
}
if (lineList.length !== 5) throw new Error(`5 lignes attendues, ${lineList.length} trouvées`);
if (stationList.length < 95 || stationList.length > 125)
  throw new Error(`Nombre de stations suspect : ${stationList.length}`);

const network: Network = {
  generatedAt: new Date().toISOString(),
  source: "OSM (Overpass, service nominal) + GTFS TaM (identité/alias) + geo.api.gouv.fr (communes)",
  stations: stationList,
  lines: lineList,
};
writeFileSync(join(ROOT, "data", "network.json"), JSON.stringify(network, null, 1));

console.log(`\n✓ data/network.json : ${stationList.length} stations, ${lineList.length} lignes`);
for (const line of lineList) {
  const count = stationList.filter((s) => s.lines.includes(line.ref)).length;
  console.log(
    `  L${line.ref} ${line.name} — ${count} stations, ${line.circular ? "circulaire" : `terminus: ${line.termini.join(", ")}`}`,
  );
}
console.log(`  P+Tram : ${stationList.filter((s) => s.parkRide).length} stations`);
console.log(
  `  Hors Montpellier : ${stationList.filter((s) => s.commune !== "Montpellier").length} stations`,
);
