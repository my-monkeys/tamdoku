/**
 * Point d'entrée « données » de l'app : charge le vrai réseau (network.json,
 * construit par le pipeline) et prépare tout ce dont l'UI a besoin — règles,
 * critères du jeu quotidien, notoriété.
 *
 * Tout ce qui sert au **tirage** et à la **saisie** est daté : une ligne entrée
 * en service après coup (`Line.since`) ne fait pas partie du réseau des grilles
 * antérieures, qui restent donc identiques (cf. engine/select.ts `networkFor`).
 * Ce qui sert de **dictionnaire d'affichage** (critères, notoriété) porte au
 * contraire sur le réseau complet : on n'y accède que par des ids déjà tirés.
 */
import rawNetwork from "../data/network.json";
import { buildRules, poolFor as enginePoolFor, restrictRules } from "../engine/rules.ts";
import { buildCriteria, terminiPhrase, type Criterion } from "../engine/criteria.ts";
import { fameByStation } from "../engine/fame.ts";
import { networkFor, stationById } from "../engine/select.ts";
import type { CompiledRule, LineRef, Network, Station } from "../engine/types.ts";

export const network = rawNetwork as unknown as Network;
export const stations: Station[] = network.stations;
export const byId = stationById(network);

/**
 * Catalogue compilé sur le réseau en vigueur à une date. Mémoïsé par **état du
 * réseau** et non par jour : tant qu'aucune ligne n'entre en service, toutes les
 * dates partagent le même catalogue.
 */
const catalogs = new Map<string, CompiledRule[]>();
function catalogFor(date: string): CompiledRule[] {
  const net = networkFor(network, date);
  const key = net.lines.map((l) => l.ref).join("");
  const cached = catalogs.get(key);
  if (cached) return cached;
  const compiled = buildRules(net);
  catalogs.set(key, compiled);
  return compiled;
}

/** Catalogue complet : dictionnaire d'affichage, jamais le tirage d'une grille. */
const allRules: CompiledRule[] = catalogFor("");
const ruleMap = new Map<string, CompiledRule>(allRules.map((r) => [r.id, r]));

/** Catalogue en vigueur pour une grille datée ("" = entraînement → tout). */
export function poolFor(date: string): CompiledRule[] {
  return enginePoolFor(catalogFor(date), date);
}

/** Stations jouables à une date : le réseau amputé des lignes pas encore ouvertes. */
export function stationsFor(date: string): Station[] {
  return networkFor(network, date).stations;
}

/** Lignes ouvertes à une date, dans l'ordre du réseau. */
export function linesFor(date: string): LineRef[] {
  return networkFor(network, date).lines.map((l) => l.ref);
}

/** Stations desservies par au moins une des lignes ([] = tout le réseau à cette date). */
export function stationsOnLines(lines: LineRef[], date = ""): Station[] {
  const scope = stationsFor(date);
  if (lines.length === 0) return scope;
  return scope.filter((s) => s.lines.some((ref) => lines.includes(ref)));
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
export function poolForLines(lines: LineRef[], date = ""): LinePool {
  const pool = catalogFor(date);
  if (lines.length === 0) return { rules: pool };
  const ids = new Set(stationsOnLines(lines, date).map((s) => s.id));
  const rules = restrictRules(pool, ids);
  const available = rules.filter((r) => r.family === "ligne").length;
  return { rules, lineRules: Math.min(lines.length - 1, 2, available) };
}

export const criteria: Map<string, Criterion> = buildCriteria(allRules);
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

/** Résumé des lignes ouvertes à une date, pour l'écran « À propos » (terminus réels). */
export function lineSummariesFor(date: string) {
  return networkFor(network, date).lines.map((line) => ({
    n: line.ref,
    valClass: `v${line.ref}`,
    name: line.ref === "A" ? "Bustram A" : `Ligne ${line.ref}`,
    term: terminiPhrase(network, line.ref),
  }));
}
