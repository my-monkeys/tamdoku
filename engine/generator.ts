/**
 * Générateur de grilles quotidiennes, déterministe : la grille du jour J est
 * entièrement définie par la date (même puzzle pour tout le monde, comme ubahndoku).
 *
 * La série se construit depuis EPOCH : chaque jour connaît les règles des jours
 * précédents (cooldown anti-répétition) et les signatures des grilles déjà émises.
 * Rejouer la série donne toujours exactement les mêmes grilles.
 */
import { hasPerfectAssignment } from "./matching.ts";
import { hashString, mulberry32, shuffle, type Rng } from "./rng.ts";
import type { CompiledRule, Grid, Network } from "./types.ts";

/** Jour du puzzle nº 1. Ne jamais changer une fois le jeu lancé. */
export const EPOCH = "2026-07-06";

export interface GeneratorOptions {
  /** Chaque case doit avoir au moins ce nombre de solutions. */
  minCellSolutions: number;
  /** Une règle utilisée il y a moins de N jours est écartée. */
  ruleCooldownDays: number;
  /**
   * Cooldown réduit pour les 5 règles « ligne » : chaque grille en exige au
   * moins une, un cooldown de 3 jours les épuiserait (5 règles, jusqu'à 3 par jour).
   */
  lineRuleCooldownDays: number;
  /** Au moins une case avec au plus N solutions (le « piment » de la grille). */
  spiceCellMax: number;
  /** Moyenne de solutions par case plafonnée (évite les grilles triviales). */
  maxAvgSolutions: number;
  maxAttempts: number;
}

export const DEFAULT_OPTIONS: GeneratorOptions = {
  minCellSolutions: 2,
  ruleCooldownDays: 3,
  lineRuleCooldownDays: 2,
  spiceCellMax: 8,
  maxAvgSolutions: 40,
  maxAttempts: 600,
};

const DAY_MS = 86_400_000;

export function dayIndexOf(date: string): number {
  const index = Math.round((Date.parse(date) - Date.parse(EPOCH)) / DAY_MS);
  if (index < 0) throw new Error(`${date} précède l'epoch ${EPOCH}`);
  return index;
}

export function dateOfDayIndex(index: number): string {
  return new Date(Date.parse(EPOCH) + index * DAY_MS).toISOString().slice(0, 10);
}

/** Poids du nombre de règles « ligne » par grille : 1 (fréquent) à 3 (rare). */
const LINE_RULE_WEIGHTS: [number, number][] = [
  [1, 0.45],
  [2, 0.4],
  [3, 0.15],
];
const MAX_PER_SUBFAMILY = 2;
const MAX_LETTER_RULES = 2;

export function pickLineRuleCount(rng: Rng): number {
  const roll = rng();
  let acc = 0;
  for (const [count, weight] of LINE_RULE_WEIGHTS) {
    acc += weight;
    if (roll < acc) return count;
  }
  return 1;
}

function intersect(a: ReadonlySet<string>, b: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const id of a) if (b.has(id)) out.push(id);
  return out.sort();
}

interface DayState {
  lastUsed: Map<string, number>;
  signatures: Set<string>;
}

/**
 * Tire 6 règles **équilibrées** : ≥ 1 ligne (jusqu'à 3), au plus 2 règles par
 * sous-famille et au plus 2 règles-lettres — pour qu'une grille ne soit jamais
 * noyée sous les « contient un X » ni monotone. Retourne null si le pool ne
 * permet pas d'en réunir 6.
 */
export function drawRuleSet(
  rng: Rng,
  candidates: CompiledRule[],
  lineRuleCount: number,
): CompiledRule[] | null {
  const lineRules = shuffle(rng, candidates.filter((r) => r.family === "ligne"));
  const others = shuffle(rng, candidates.filter((r) => r.family !== "ligne"));
  if (lineRules.length < lineRuleCount) return null;

  const chosen: CompiledRule[] = lineRules.slice(0, lineRuleCount);
  const subfamilyCounts = new Map<string, number>([["ligne", lineRuleCount]]);
  let letterCount = 0;
  for (const rule of others) {
    if (chosen.length === 6) break;
    const sub = subfamilyCounts.get(rule.subfamily) ?? 0;
    if (sub >= MAX_PER_SUBFAMILY) continue;
    if (rule.subfamily === "contient-lettre" && letterCount >= MAX_LETTER_RULES) continue;
    chosen.push(rule);
    subfamilyCounts.set(rule.subfamily, sub + 1);
    if (rule.subfamily === "contient-lettre") letterCount++;
  }
  return chosen.length === 6 ? chosen : null;
}

function tryBuildGrid(
  rules: CompiledRule[],
  rng: Rng,
  state: DayState,
  dayIndex: number,
  opts: GeneratorOptions,
  relaxed: boolean,
): { rows: CompiledRule[]; cols: CompiledRule[]; solutions: string[][][] } | null {
  const candidates = rules.filter((rule) => {
    const base = rule.family === "ligne" ? opts.lineRuleCooldownDays : opts.ruleCooldownDays;
    const cooldown = relaxed ? 1 : base;
    const last = state.lastUsed.get(rule.id);
    return last === undefined || dayIndex - last >= cooldown;
  });
  if (candidates.length < 6) return null;

  const chosen = drawRuleSet(rng, candidates, pickLineRuleCount(rng));
  if (!chosen) return null;

  const signature = chosen
    .map((r) => r.id)
    .sort()
    .join("|");
  if (state.signatures.has(signature)) return null;

  const arranged = shuffle(rng, chosen);
  const rows = arranged.slice(0, 3);
  const cols = arranged.slice(3, 6);

  const solutions: string[][][] = [];
  const flatCells: Set<string>[] = [];
  let total = 0;
  let minCell = Infinity;
  for (const row of rows) {
    const rowSolutions: string[][] = [];
    for (const col of cols) {
      const ids = intersect(row.stationIds, col.stationIds);
      if (ids.length < opts.minCellSolutions) return null;
      rowSolutions.push(ids);
      flatCells.push(new Set(ids));
      total += ids.length;
      minCell = Math.min(minCell, ids.length);
    }
    solutions.push(rowSolutions);
  }
  if (!relaxed && minCell > opts.spiceCellMax) return null;
  if (!relaxed && total / 9 > opts.maxAvgSolutions) return null;
  if (!hasPerfectAssignment(flatCells)) return null;

  state.signatures.add(signature);
  return { rows, cols, solutions };
}

function generateDay(
  rules: CompiledRule[],
  state: DayState,
  dayIndex: number,
  opts: GeneratorOptions,
): Grid {
  const rng = mulberry32(hashString(`tamdoku:${EPOCH}:${dayIndex}`));
  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    const relaxed = attempt >= opts.maxAttempts / 2;
    const built = tryBuildGrid(rules, rng, state, dayIndex, opts, relaxed);
    if (!built) continue;
    for (const rule of [...built.rows, ...built.cols]) state.lastUsed.set(rule.id, dayIndex);
    const difficulty = Number(
      built.solutions
        .flat()
        .reduce((sum, cell) => sum + 1 / cell.length, 0)
        .toFixed(3),
    );
    return {
      date: dateOfDayIndex(dayIndex),
      number: dayIndex + 1,
      rows: built.rows.map((r) => r.id) as Grid["rows"],
      cols: built.cols.map((r) => r.id) as Grid["cols"],
      solutions: built.solutions,
      difficulty,
    };
  }
  throw new Error(`Impossible de générer la grille du jour ${dayIndex} (${dateOfDayIndex(dayIndex)})`);
}

/** Génère les `count` premières grilles à partir de l'epoch. */
export function generateSeries(
  _net: Network,
  rules: CompiledRule[],
  count: number,
  options: Partial<GeneratorOptions> = {},
): Grid[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const state: DayState = { lastUsed: new Map(), signatures: new Set() };
  const grids: Grid[] = [];
  for (let day = 0; day < count; day++) grids.push(generateDay(rules, state, day, opts));
  return grids;
}

/** Grille d'une date donnée (rejoue la série depuis l'epoch — déterministe). */
export function puzzleForDate(
  net: Network,
  rules: CompiledRule[],
  date: string,
  options: Partial<GeneratorOptions> = {},
): Grid {
  const index = dayIndexOf(date);
  return generateSeries(net, rules, index + 1, options)[index]!;
}
