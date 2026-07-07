import { query } from "./_generated/server";
import { v } from "convex/values";
import network from "../data/network.json";
import { buildRules } from "../engine/rules.ts";
import { buildCriteria } from "../engine/criteria.ts";
import { generateDaily, seedForDate } from "../engine/daily.ts";
import type { Network } from "../engine/types.ts";

/**
 * Recalcule la grille déterministe d'une date via le moteur tamdoku (pur,
 * browser-safe, embarqué ici) pour exposer le **critère de chaque ligne/colonne**.
 * Même network.json + même engine que la SPA → grille strictement identique.
 * Sert au drill-down du dashboard (libeller les cases par leur règle).
 */
const pool = buildRules(network as unknown as Network);
const criteria = buildCriteria(pool);
const labelOf = (id: string): string => criteria.get(id)?.label ?? id;

export const grid = query({
  args: { date: v.string() },
  handler: async (_ctx, { date }) => {
    const puzzle = generateDaily(pool, seedForDate(date));
    return {
      date,
      rows: puzzle.rows.map((id) => ({ id, label: labelOf(id) })),
      cols: puzzle.cols.map((id) => ({ id, label: labelOf(id) })),
    };
  },
});
