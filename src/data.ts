/**
 * Point d'entrée « données » de l'app : charge le vrai réseau (network.json,
 * construit par le pipeline) et prépare tout ce dont l'UI a besoin — règles,
 * critères du jeu quotidien, notoriété. Tout est calculé une fois au chargement.
 */
import rawNetwork from "../data/network.json";
import { buildRules } from "../engine/rules.ts";
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
