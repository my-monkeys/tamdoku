/**
 * Géométrie du plan réseau pour l'indice : projette les stations (lat/lon réels)
 * dans un repère SVG et trace les 5 lignes en **courbes lissées** (spline
 * Catmull-Rom) à travers la séquence de stations. Calculé une fois.
 *
 * Source = `network.json` (réseau **nominal** OSM = exactement le tracé des règles),
 * PAS les tracés GTFS (qui portent les déviations travaux été 2026). Les stations
 * tombent donc sur la ligne par construction, et le plan colle au jeu. Couleurs =
 * palette de l'app par ref (network.json a la L5 cassée : color = "#").
 */
import { network, byId } from "./data.ts";
import type { LineRef } from "../engine/types.ts";

const LINE_COLORS: Record<LineRef, string> = {
  "1": "#0059a2",
  "2": "#ef7d00",
  "3": "#c6d302",
  "4": "#4c2b0e",
  "5": "#287530",
};

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

function build(): MapGeo {
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
  const width = spanX * scale + 2 * PAD;
  const height = spanY * scale + 2 * PAD;

  const px = (lon: number) => PAD + (lon - minLon) * kx * scale;
  const py = (lat: number) => PAD + (maxLat - lat) * scale; // nord en haut

  const points: MapPoint[] = network.stations.map((s) => ({ id: s.id, x: px(s.lon), y: py(s.lat) }));

  const tracks: MapTrack[] = [];
  for (const line of network.lines) {
    for (const branch of line.branches) {
      const pts = branch
        .map((id) => byId.get(id))
        .filter((s): s is NonNullable<typeof s> => Boolean(s))
        .map((s) => ({ x: px(s.lon), y: py(s.lat) }));
      if (pts.length < 2) continue;
      tracks.push({ color: LINE_COLORS[line.ref], d: spline(pts) });
    }
  }

  return { width, height, points, tracks };
}

export const mapGeo: MapGeo = build();
