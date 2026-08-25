/**
 * Géométrie du plan réseau pour l'indice : projette les stations (lat/lon réels)
 * dans un repère SVG et trace les lignes en **courbes lissées** (spline
 * Catmull-Rom) à travers la séquence de stations.
 *
 * Source = `network.json` (réseau **nominal** OSM = exactement le tracé des règles),
 * PAS les tracés GTFS (qui portent les déviations travaux été 2026). Les stations
 * tombent donc sur la ligne par construction, et le plan colle au jeu.
 *
 * Le plan est **daté** comme le reste du jeu : une grille d'archive montre le
 * réseau de sa date, sans les lignes ouvertes depuis. Le cadrage, lui, est
 * calculé une fois pour toutes sur le réseau complet — sinon l'échelle (et donc
 * le cercle des règles de distance) sauterait d'une date à l'autre.
 */
import { network, byId, stationsFor } from "./data.ts";
import { LINE_COLORS } from "./lineColors.ts";
import { networkFor } from "../engine/select.ts";

export interface MapPoint {
  id: string;
  x: number;
  y: number;
}
export interface MapTrack {
  color: string;
  d: string;
}
export interface MapGeo {
  width: number;
  height: number;
  /** Facteur mètres → unités SVG (projection plane, fidèle à `metersBetween`). */
  pxPerMeter: number;
  points: MapPoint[];
  tracks: MapTrack[];
}

/** Chemin SVG lissé (Catmull-Rom → Bézier cubique) passant par tous les points. */
function spline(pts: { x: number; y: number }[]): string {
  let d = `M ${pts[0]!.x.toFixed(1)} ${pts[0]!.y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/** Cadrage commun à toutes les dates : emprise du réseau complet. */
const frame = (() => {
  const SIZE = 1000;
  const PAD = 44;
  const lats = network.stations.map((s) => s.lat);
  const lons = network.stations.map((s) => s.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const kx = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180)); // correction longitude
  const spanX = (maxLon - minLon) * kx;
  const spanY = maxLat - minLat;
  const scale = (SIZE - 2 * PAD) / Math.max(spanX, spanY);
  return {
    width: spanX * scale + 2 * PAD,
    height: spanY * scale + 2 * PAD,
    pxPerMeter: scale / 111_320,
    px: (lon: number) => PAD + (lon - minLon) * kx * scale,
    py: (lat: number) => PAD + (maxLat - lat) * scale, // nord en haut
  };
})();

function build(date: string): MapGeo {
  const { px, py } = frame;
  const points: MapPoint[] = stationsFor(date).map((s) => ({ id: s.id, x: px(s.lon), y: py(s.lat) }));

  const tracks: MapTrack[] = [];
  for (const line of networkFor(network, date).lines) {
    for (const branch of line.branches) {
      const pts = branch
        .map((id) => byId.get(id))
        .filter((s): s is NonNullable<typeof s> => Boolean(s))
        .map((s) => ({ x: px(s.lon), y: py(s.lat) }));
      if (pts.length < 2) continue;
      tracks.push({ color: LINE_COLORS[line.ref], d: spline(pts) });
    }
  }

  const { width, height, pxPerMeter } = frame;
  return { width, height, pxPerMeter, points, tracks };
}

/** Plan du réseau à une date, mémoïsé par état du réseau (pas par jour). */
const plans = new Map<string, MapGeo>();
export function mapGeoFor(date: string): MapGeo {
  const key = networkFor(network, date).lines.map((l) => l.ref).join("");
  const cached = plans.get(key);
  if (cached) return cached;
  const plan = build(date);
  plans.set(key, plan);
  return plan;
}
