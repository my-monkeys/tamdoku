/**
 * Point d'entrée « données » de l'app : charge le vrai réseau (network.json,
 * construit par le pipeline) et prépare tout ce dont l'UI a besoin — règles,
 * critères du jeu quotidien, notoriété. Tout est calculé une fois au chargement.
 */
import rawNetwork from "../data/network.json";
import { buildRules, DOUBLE_LETTER_PER_WORD_FROM } from "../engine/rules.ts";
import { buildCriteria, terminiPhrase, type Criterion } from "../engine/criteria.ts";
import { fameByStation } from "../engine/fame.ts";
import { stationById } from "../engine/select.ts";
import type { CompiledRule, LineRef, Network, Station } from "../engine/types.ts";

export const network = rawNetwork as unknown as Network;
export const stations: Station[] = network.stations;
export const byId = stationById(network);

/** L'ensemble du catalogue de règles alimente la grille du jour. */
export const pool: CompiledRule[] = buildRules(network);
/** Catalogue d'avant la bascule « lettre doublée » : rejoue l'archive à l'identique. */
const poolLegacy: CompiledRule[] = buildRules(network, { legacyDoubleLetter: true });
const ruleMap = new Map<string, CompiledRule>(pool.map((r) => [r.id, r]));
const ruleMapLegacy = new Map<string, CompiledRule>(poolLegacy.map((r) => [r.id, r]));

export const criteria: Map<string, Criterion> = buildCriteria(pool);
export const fame: Map<string, number> = fameByStation(network);

/** Catalogue en vigueur pour une date de grille ("" = hors calendrier → courant). */
export function poolFor(date: string): CompiledRule[] {
  return date !== "" && date < DOUBLE_LETTER_PER_WORD_FROM ? poolLegacy : pool;
}

export function rule(id: string, date = ""): CompiledRule {
  const map = poolFor(date) === pool ? ruleMap : ruleMapLegacy;
  const r = map.get(id);
  if (!r) throw new Error(`Règle inconnue : ${id}`);
  return r;
}

export function criterion(id: string): Criterion {
  const c = criteria.get(id);
  if (!c) throw new Error(`Critère inconnu : ${id}`);
  return c;
}

/** Une station satisfait-elle le critère (règle) donné, pour la grille datée ? */
export function satisfies(station: Station, ruleId: string, date = ""): boolean {
  return rule(ruleId, date).stationIds.has(station.id);
}

/** Résumé des 5 lignes pour l'écran « À propos » (terminus réels). */
export const lineSummaries = (["1", "2", "3", "4", "5"] as LineRef[]).map((ref) => ({
  n: Number(ref),
  valClass: `v${ref}`,
  name: `Ligne ${ref}`,
  term: terminiPhrase(network, ref),
}));
