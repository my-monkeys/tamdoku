/**
 * Notoriété d'une station (0 = confidentielle, 10 = archi-connue), dérivée de
 * façon déterministe des données réelles — pas de curation à la main sur 110
 * stations. Sert à deux choses côté jeu :
 *  - classer les suggestions du mode simple (les plus connues d'abord),
 *  - le **score d'originalité** en cold-start : tant qu'on n'a pas les vraies
 *    statistiques joueurs, une réponse rare/peu évidente (faible notoriété)
 *    rapporte plus de points qu'une réponse que tout le monde donnerait.
 *
 * Heuristique : les correspondances, terminus, P+Tram et stations centrales
 * sont les plus identifiables du réseau.
 */
import { metersBetween } from "./geo.ts";
import type { Network, Station } from "./types.ts";

/** Station Comédie = cœur du réseau, référence de centralité. */
function centre(net: Network): { lat: number; lon: number } {
  const comedie = net.stations.find((s) => s.id === "comedie");
  if (!comedie) throw new Error("Station de référence « comedie » introuvable");
  return { lat: comedie.lat, lon: comedie.lon };
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

export function fameOf(station: Station, centre: { lat: number; lon: number }): number {
  let score = 3;
  score += (station.lines.length - 1) * 1.7; // les correspondances sont les plus connues
  if (station.terminusOf.length > 0) score += 1;
  if (station.parkRide) score += 0.5;
  const dist = metersBetween(station, centre);
  if (dist < 1500) score += 1.6;
  else if (dist > 5000) score -= 1;
  return Number(clamp(score, 0, 10).toFixed(2));
}

/** Notoriété par id de station, calculée une fois pour tout le réseau. */
export function fameByStation(net: Network): Map<string, number> {
  const c = centre(net);
  return new Map(net.stations.map((s) => [s.id, fameOf(s, c)]));
}

/**
 * Points d'originalité d'une bonne réponse (cold-start, avant stats joueurs).
 * Reprend le barème du design : socle de 40 par bonne case + jusqu'à 60 selon
 * la rareté (notoriété faible = plus de points).
 */
export function originalityPoints(fame: number): number {
  return 40 + Math.round((60 * (10 - fame)) / 10);
}
