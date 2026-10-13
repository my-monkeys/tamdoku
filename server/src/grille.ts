/**
 * Grille déterministe d'une date : même network.json et même moteur que la SPA.
 *
 * Le catalogue est recompilé sur le **réseau** de la date (une ligne ouverte
 * depuis n'existait pas dans les grilles antérieures), puis filtré des règles
 * pas encore entrées au tirage. Les deux étapes comptent, et il faut les mêmes
 * que src/data.ts, sinon la page ops étiquette l'archive avec de mauvais
 * critères et `/submit` refuse des réponses justes.
 */

import network from "../../data/network.json" with { type: "json" };
import { buildRules, poolFor } from "../../engine/rules.ts";
import { networkFor } from "../../engine/select.ts";
import { buildCriteria } from "../../engine/criteria.ts";
import { generateDaily, seedForDate, type DailyPuzzle } from "../../engine/daily.ts";
import type { Network } from "../../engine/types.ts";

/** Le tirage coûte ~800 essais : on garde les dernières dates demandées, pas toutes. */
const GRILLES_EN_CACHE = 16;

const reseau = network as unknown as Network;
const catalogues = new Map<string, ReturnType<typeof buildRules>>();
const grilles = new Map<string, DailyPuzzle>();

function catalogueAt(date: string) {
  const net = networkFor(reseau, date);
  const cle = net.lines.map((l) => l.ref).join("");
  const connu = catalogues.get(cle);
  if (connu) return connu;
  const compile = buildRules(net);
  catalogues.set(cle, compile);
  return compile;
}

const criteres = buildCriteria(catalogueAt(""));
export const libelle = (id: string): string => criteres.get(id)?.label ?? id;

export function grilleDu(date: string): DailyPuzzle {
  const connue = grilles.get(date);
  if (connue) return connue;
  const grille = generateDaily(poolFor(catalogueAt(date), date), seedForDate(date));
  if (grilles.size >= GRILLES_EN_CACHE) grilles.delete(grilles.keys().next().value!);
  grilles.set(date, grille);
  return grille;
}

/**
 * Vrai si chaque case envoyée est une bonne réponse sur la grille de la date.
 *
 * Un client resté sur une ancienne version (PWA pas mise à jour) calcule une
 * autre grille pour la même date et remonterait des réponses justes chez lui,
 * fausses pour tous les autres — Garcia Lorca en « Un seul mot × H », le
 * 12/10/2026. Une seule case hors grille suffit à écarter tout l'envoi : ce
 * joueur ne jouait pas la grille du jour.
 */
export function surLaGrille(date: string, cells: unknown[]): boolean {
  const { valid } = grilleDu(date);
  return cells.every((c) => {
    const { cell, station } = (c ?? {}) as { cell?: unknown; station?: unknown };
    return typeof cell === "number" && typeof station === "string" && valid[cell]?.includes(station) === true;
  });
}
