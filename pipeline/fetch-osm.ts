/**
 * Récupère depuis Overpass (OSM) :
 *  - les relations route=tram du réseau TaM + leurs nœuds d'arrêt (service nominal),
 *  - les parkings-relais (park_ride) de la métropole pour l'attribut P+Tram.
 * Snapshots committés dans data/raw/ pour des builds reproductibles.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OVERPASS = "https://overpass-api.de/api/interpreter";
const BBOX = "43.5,3.7,43.8,4.1";

const TRAM_QUERY = `
[out:json][timeout:120];
rel["route"="tram"](${BBOX})->.r;
.r out body;
node(r.r);
out body;
`;

const PARK_RIDE_QUERY = `
[out:json][timeout:60];
nwr["amenity"="parking"]["park_ride"]["park_ride"!="no"](${BBOX});
out center tags;
`;

async function overpass(query: string): Promise<unknown> {
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      // Overpass renvoie 406 aux user-agents génériques
      "user-agent": "tamdoku-pipeline/0.1 (jeu tamdoku, contact: my-monkey.fr)",
    },
    body: new URLSearchParams({ data: query }),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}: ${await res.text()}`);
  return res.json();
}

const rawDir = join(ROOT, "data", "raw");
mkdirSync(rawDir, { recursive: true });

console.log("Fetch Overpass : relations tram TaM…");
const tram = await overpass(TRAM_QUERY);
writeFileSync(join(rawDir, "osm-tram.json"), JSON.stringify(tram, null, 1));

console.log("Fetch Overpass : parkings-relais…");
const parkRide = await overpass(PARK_RIDE_QUERY);
writeFileSync(join(rawDir, "osm-parkride.json"), JSON.stringify(parkRide, null, 1));

console.log("OK → data/raw/osm-tram.json, data/raw/osm-parkride.json");
