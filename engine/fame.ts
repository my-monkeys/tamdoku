/**
 * Notoriété d'une station (0 = confidentielle, 10 = archi-connue), dérivée de
 * façon déterministe des données réelles — pas de curation à la main sur 110
 * stations. Sert à deux choses côté jeu :
 *  - classer les suggestions du mode simple (les plus connues d'abord),
 *  - le **score d'originalité en cold-start** : tant qu'on n'a pas les vraies
 *    statistiques joueurs (src/stats.ts), une réponse rare/peu évidente (faible
 *    notoriété) rapporte plus de points qu'une réponse que tout le monde donne.
 *
 * Heuristique : ce qui rend une station identifiable, c'est le **réseau**, pas
 * la géographie. Les correspondances (plusieurs lignes), les terminus (affichés
 * à l'avant des trams et dans les annonces) et les P+Tram sont les repères ; une
 * petite station de passage sur une seule ligne est la plus confidentielle.
 *
 * NB : historiquement un bonus de « proximité au centre » gonflait des stations
 * centrales mais méconnues (ex. Pompignane) au détriment de terminus excentrés
 * pourtant connus. Retiré : la centralité géographique n'est pas de la notoriété.
 */
import type { Network, Station } from "./types.ts";

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

export function fameOf(station: Station): number {
  let score = 2.5;
  score += (station.lines.length - 1) * 2; // les correspondances sont les plus connues
  if (station.terminusOf.length > 0) score += 2; // un terminus est un nom de destination
  if (station.parkRide) score += 0.8; // P+Tram = repère d'entrée d'agglo
  return Number(clamp(score, 0, 10).toFixed(2));
}

/** Notoriété par id de station, calculée une fois pour tout le réseau. */
export function fameByStation(net: Network): Map<string, number> {
  return new Map(net.stations.map((s) => [s.id, fameOf(s)]));
}

/**
 * Points d'originalité d'une bonne réponse (cold-start, avant stats joueurs).
 * Reprend le barème du design : socle de 40 par bonne case + jusqu'à 60 selon
 * la rareté (notoriété faible = plus de points).
 */
export function originalityPoints(fame: number): number {
  return 40 + Math.round((60 * (10 - fame)) / 10);
}
