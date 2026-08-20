/**
 * Point d'entrée « données » de l'app : charge le vrai réseau (network.json,
 * construit par le pipeline) et prépare tout ce dont l'UI a besoin — règles,
 * critères du jeu quotidien, notoriété. Tout est calculé une fois au chargement.
 */
import rawNetwork from "../data/network.json";
import { buildRules, poolFor as enginePoolFor, restrictRules } from "../engine/rules.ts";
import { buildCriteria, terminiPhrase, type Criterion } from "../engine/criteria.ts";
import { fameByStation } from "../engine/fame.ts";
import { stationById } from "../engine/select.ts";
import type { CompiledRule, LineRef, Network, Station } from "../engine/types.ts";

export const network = rawNetwork as unknown as Network;
export const stations: Station[] = network.stations;
export const byId = stationById(network);

/** L'ensemble du catalogue de règles alimente la grille du jour. */
export const pool: CompiledRule[] = buildRules(network);
const ruleMap = new Map<string, CompiledRule>(pool.map((r) => [r.id, r]));

/** Catalogue en vigueur pour une grille datée ("" = entraînement → tout). */
export function poolFor(date: string): CompiledRule[] {
  return enginePoolFor(pool, date);
}

/** Stations desservies par au moins une des lignes ([] = tout le réseau). */
export function stationsOnLines(lines: LineRef[]): Station[] {
  if (lines.length === 0) return stations;
  return stations.filter((s) => s.lines.some((ref) => lines.includes(ref)));
}

export interface LinePool {
  rules: CompiledRule[];
  /** Règles « ligne » à imposer au tirage ; absent = tirage pondéré habituel. */
  lineRules?: number;
}

/**
 * Catalogue d'entraînement restreint à une sélection de lignes. Sur une seule
 * ligne, le critère « Sur la ligne N » est vrai partout : il sort du tirage.
 * Au-delà, il redevient discriminant — on en impose autant que le périmètre en
 * supporte, plafonné à 2 pour laisser de la place aux autres familles.
 */
export function poolForLines(lines: LineRef[]): LinePool {
  if (lines.length === 0) return { rules: pool };
  const ids = new Set(stationsOnLines(lines).map((s) => s.id));
  const rules = restrictRules(pool, ids);
  const available = rules.filter((r) => r.family === "ligne").length;
  return { rules, lineRules: Math.min(lines.length - 1, 2, available) };
}

export const criteria: Map<string, Criterion> = buildCriteria(pool);
export const fame: Map<string, number> = fameByStation(network);

export function rule(id: string): CompiledRule {
  const r = ruleMap.get(id);
  if (!r) throw new Error(`Règle inconnue : ${id}`);
  return r;
}

export function criterion(id: string): Criterion {
  const c = criteria.get(id);
  if (!c) throw new Error(`Critère inconnu : ${id}`);
  return c;
}

/** Une station satisfait-elle le critère (règle) donné ? */
export function satisfies(station: Station, ruleId: string): boolean {
  return rule(ruleId).stationIds.has(station.id);
}

/** Résumé des 5 lignes pour l'écran « À propos » (terminus réels). */
export const lineSummaries = (["1", "2", "3", "4", "5"] as LineRef[]).map((ref) => ({
  n: Number(ref),
  valClass: `v${ref}`,
  name: `Ligne ${ref}`,
  term: terminiPhrase(network, ref),
}));
