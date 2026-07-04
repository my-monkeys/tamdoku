/** Géométrie pure (aucune dépendance Node) — importable côté navigateur. */

export interface LatLon {
  lat: number;
  lon: number;
}

/** Distance à vol d'oiseau en mètres (approximation plane, suffisante à l'échelle de la métropole). */
export function metersBetween(a: LatLon, b: LatLon): number {
  const dx = (a.lon - b.lon) * Math.cos((a.lat * Math.PI) / 180) * 111_320;
  const dy = (a.lat - b.lat) * 111_320;
  return Math.hypot(dx, dy);
}
