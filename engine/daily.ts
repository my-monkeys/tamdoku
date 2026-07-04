/**
 * Générateur de la grille du jour, indépendant par date (contrairement à
 * generator.ts qui produit une série anti-répétition sur le pool complet).
 *
 * À partir d'une graine dérivée de la date, on tire la meilleure grille parmi N
 * essais sur **tout le catalogue de règles**, avec l'équilibrage de familles de
 * `drawRuleSet` (≥ 1 ligne, ≤ 2 par sous-famille, ≤ 2 lettres) pour garder des
 * grilles variées et lisibles. Chaque jour est tiré isolément — O(1) au
 * chargement, quelle que soit la date, et déterministe.
 */
import { drawRuleSet, pickLineRuleCount } from "./generator.ts";
import { hasPerfectAssignment } from "./matching.ts";
import { mulberry32, shuffle, type Rng } from "./rng.ts";
import type { CompiledRule } from "./types.ts";

export interface DailyPuzzle {
  /** Ids de règles portés par les 3 lignes puis les 3 colonnes. */
  rows: [string, string, string];
  cols: [string, string, string];
  /** Solutions par case (ids de stations), row-major, 9 entrées triées. */
  valid: string[][];
}

export interface DailyOptions {
  attempts: number;
  /** Au-delà de cette taille, une case est jugée trop facile (pénalité qualité). */
  looseCell: number;
  targetAvgMin: number;
  targetAvgMax: number;
}

export const DEFAULT_DAILY: DailyOptions = {
  attempts: 800,
  looseCell: 16,
  targetAvgMin: 2,
  targetAvgMax: 8,
};

function intersect(a: ReadonlySet<string>, b: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const id of a) if (b.has(id)) out.push(id);
  return out.sort();
}

function cellsFor(rows: CompiledRule[], cols: CompiledRule[]): string[][] {
  const cells: string[][] = [];
  for (const row of rows) for (const col of cols) cells.push(intersect(row.stationIds, col.stationIds));
  return cells;
}

function quality(cells: string[][], rows: CompiledRule[], cols: CompiledRule[], opts: DailyOptions): number {
  const avg = cells.reduce((sum, c) => sum + c.length, 0) / 9;
  const distinctLines = new Set(
    [...rows, ...cols].filter((r) => r.family === "ligne").map((r) => r.id),
  ).size;
  let q = 0;
  if (avg >= opts.targetAvgMin && avg <= opts.targetAvgMax) q += 2;
  else if (avg > opts.targetAvgMax) q -= 1;
  if (distinctLines >= 3) q += 1;
  if (distinctLines >= 2) q += 1;
  if (cells.some((c) => c.length > opts.looseCell)) q -= 2;
  if (cells.filter((c) => c.length === 1).length <= 2) q += 1;
  return q;
}

/** Grille pour une graine donnée (déterministe), sur l'ensemble des règles. */
export function generateDaily(
  rules: CompiledRule[],
  seed: number,
  options: Partial<DailyOptions> = {},
): DailyPuzzle {
  const opts = { ...DEFAULT_DAILY, ...options };
  const rng: Rng = mulberry32(seed);
  let best: { rows: CompiledRule[]; cols: CompiledRule[]; cells: string[][]; q: number } | null = null;

  for (let attempt = 0; attempt < opts.attempts; attempt++) {
    const chosen = drawRuleSet(rng, rules, pickLineRuleCount(rng));
    if (!chosen) continue;
    const arranged = shuffle(rng, chosen);
    const rows = arranged.slice(0, 3);
    const cols = arranged.slice(3, 6);
    const cells = cellsFor(rows, cols);
    if (cells.some((c) => c.length === 0)) continue;
    if (!hasPerfectAssignment(cells.map((c) => new Set(c)))) continue;
    const q = quality(cells, rows, cols, opts);
    if (!best || q > best.q) best = { rows, cols, cells, q };
    if (best.q >= 4 && attempt > 25) break;
  }

  if (!best) throw new Error("Aucune grille valide : catalogue de règles trop pauvre");
  return {
    rows: best.rows.map((r) => r.id) as [string, string, string],
    cols: best.cols.map((r) => r.id) as [string, string, string],
    valid: best.cells,
  };
}

/** Graine stable pour une date ISO (YYYY-MM-DD). */
export function seedForDate(date: string): number {
  let h = (1779033703 ^ date.length) >>> 0;
  for (let i = 0; i < date.length; i++) {
    h = Math.imul(h ^ date.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
