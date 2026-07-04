/**
 * Point d'entrée « données » de l'app : charge le vrai réseau (network.json,
 * construit par le pipeline) et prépare tout ce dont l'UI a besoin — règles,
 * critères du jeu quotidien, notoriété. Tout est calculé une fois au chargement.
 */
import rawNetwork from "../data/network.json";
import { buildRules } from "../engine/rules.ts";
import { buildCriteria, dailyPool, terminiPhrase, type Criterion } from "../engine/criteria.ts";
import { fameByStation } from "../engine/fame.ts";
import { stationById } from "../engine/select.ts";
import type { CompiledRule, LineRef, Network, Station } from "../engine/types.ts";

export const network = rawNetwork as unknown as Network;
export const stations: Station[] = network.stations;
export const byId = stationById(network);

const allRules = buildRules(network);
const ruleMap = new Map<string, CompiledRule>(allRules.map((r) => [r.id, r]));

/** Les 9 critères évocateurs du jeu quotidien (règles compilées, ordre d'affichage). */
export const pool: CompiledRule[] = dailyPool(allRules);
export const criteria: Map<string, Criterion> = buildCriteria();
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
  term: ref === "4" ? "Circulaire — l’Écusson" : terminiPhrase(network, ref),
}));
