/**
 * Correspondance entre la saisie du joueur et les stations : insensible à la
 * casse, aux accents, à la ponctuation et aux espaces ; les alias (noms GTFS,
 * quais directionnels, noms courts) comptent comme le nom canonique.
 */
import { fold } from "./text.ts";
import type { Station } from "./types.ts";

export function normalizeAnswer(input: string): string {
  return fold(input).replace(/[^a-z0-9]/g, "");
}

export function stationAnswerKeys(station: Station): Set<string> {
  return new Set([station.name, ...station.aliases].map(normalizeAnswer));
}

export function matchesStation(input: string, station: Station): boolean {
  return stationAnswerKeys(station).has(normalizeAnswer(input));
}

/** Station correspondant exactement à la saisie, ou undefined si aucune/ambiguë. */
export function findStation(input: string, stations: Station[]): Station | undefined {
  const matches = stations.filter((s) => matchesStation(input, s));
  return matches.length === 1 ? matches[0] : undefined;
}

/** Suggestions pour l'autocomplete du mode normal : préfixe sur nom ou alias. */
export function suggestStations(input: string, stations: Station[], limit = 8): Station[] {
  const key = normalizeAnswer(input);
  if (key.length < 2) return [];
  return stations
    .filter((s) => [...stationAnswerKeys(s)].some((k) => k.startsWith(key)))
    .slice(0, limit);
}
