/**
 * Correspondance entre la saisie du joueur et les stations : insensible à la
 * casse, aux accents, à la ponctuation et aux espaces ; les alias (noms GTFS,
 * quais directionnels, noms courts) comptent comme le nom canonique. « St » est
 * accepté pour « Saint ». La résolution tolère une saisie partielle tant qu'elle
 * ne désigne qu'une seule station.
 */
import { fold } from "./text.ts";
import type { Station } from "./types.ts";

/** Forme normalisée espace-séparée d'un nom/saisie. */
export function normalizeAnswer(input: string): string {
  return fold(input)
    .replace(/[’'`]/g, " ")
    .replace(/[-–—]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\bst\b/g, "saint")
    .replace(/\s+/g, " ")
    .trim();
}

export function stationAnswerKeys(station: Station): string[] {
  return [station.name, ...station.aliases].map(normalizeAnswer);
}

export function matchesStation(input: string, station: Station): boolean {
  return stationAnswerKeys(station).includes(normalizeAnswer(input));
}

/** Résout une saisie : correspondance exacte (nom/alias) prioritaire, sinon
 * sous-chaîne unique. Renvoie undefined si rien ne correspond ou si c'est ambigu. */
export function findStation(input: string, stations: Station[]): Station | undefined {
  const q = normalizeAnswer(input);
  if (q.length < 2) return undefined;
  for (const s of stations) if (stationAnswerKeys(s).includes(q)) return s;
  const subs = stations.filter((s) => stationAnswerKeys(s).some((k) => k.includes(q)));
  return subs.length === 1 ? subs[0] : undefined;
}

export interface SuggestOptions {
  /** Ids de stations à masquer (déjà placées dans la grille). */
  exclude?: ReadonlySet<string>;
  /** Notoriété par id : classe les suggestions, les plus connues d'abord. */
  fame?: ReadonlyMap<string, number>;
  limit?: number;
}

/** Suggestions pour l'autocomplete du mode simple : préfixe d'abord, puis
 * sous-chaîne, chaque groupe trié par notoriété décroissante. */
export function suggestStations(
  input: string,
  stations: Station[],
  options: SuggestOptions = {},
): Station[] {
  const q = normalizeAnswer(input);
  if (q.length < 1) return [];
  const { exclude, fame, limit = 6 } = options;
  const pre: Station[] = [];
  const sub: Station[] = [];
  for (const s of stations) {
    if (exclude?.has(s.id)) continue;
    const keys = stationAnswerKeys(s);
    if (keys.some((k) => k.startsWith(q))) pre.push(s);
    else if (keys.some((k) => k.includes(q))) sub.push(s);
  }
  const byFame = (a: Station, b: Station) => (fame?.get(b.id) ?? 0) - (fame?.get(a.id) ?? 0);
  pre.sort(byFame);
  sub.sort(byFame);
  return [...pre, ...sub].slice(0, limit);
}
