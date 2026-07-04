import { describe, expect, it } from "vitest";
import { loadNetwork } from "../engine/network.ts";
import { buildRules } from "../engine/rules.ts";
import {
  DEFAULT_OPTIONS,
  EPOCH,
  dayIndexOf,
  generateSeries,
  puzzleForDate,
} from "../engine/generator.ts";

const net = loadNetwork();
const rules = buildRules(net);
const ruleById = new Map(rules.map((r) => [r.id, r]));

const YEAR = 365;
const series = generateSeries(net, rules, YEAR);

describe("générateur quotidien", () => {
  it("est déterministe : deux exécutions identiques", () => {
    const again = generateSeries(net, rules, 10);
    expect(again).toEqual(series.slice(0, 10));
    expect(puzzleForDate(net, rules, "2026-07-15")).toEqual(series[dayIndexOf("2026-07-15")]);
  });

  it("numérote depuis l'epoch", () => {
    expect(series[0]!.date).toBe(EPOCH);
    expect(series[0]!.number).toBe(1);
    expect(series[9]!.number).toBe(10);
  });

  it("chaque grille d'une année est valide et jouable", () => {
    for (const grid of series) {
      const all = [...grid.rows, ...grid.cols];
      expect(new Set(all).size).toBe(6);
      expect(all.some((id) => ruleById.get(id)!.family === "ligne"), grid.date).toBe(true);
      for (const row of grid.solutions) {
        for (const cell of row) {
          expect(cell.length, grid.date).toBeGreaterThanOrEqual(DEFAULT_OPTIONS.minCellSolutions);
        }
      }
    }
  });

  it("les solutions respectent réellement les règles ligne et colonne", () => {
    for (const grid of series.slice(0, 30)) {
      grid.rows.forEach((rowId, i) => {
        grid.cols.forEach((colId, j) => {
          for (const stationId of grid.solutions[i]![j]!) {
            expect(ruleById.get(rowId)!.stationIds.has(stationId)).toBe(true);
            expect(ruleById.get(colId)!.stationIds.has(stationId)).toBe(true);
          }
        });
      });
    }
  });

  it("cooldown : jamais la même règle deux jours de suite, 3 jours hors lignes", () => {
    const lastSeen = new Map<string, number>();
    series.forEach((grid, day) => {
      for (const id of [...grid.rows, ...grid.cols]) {
        const last = lastSeen.get(id);
        const minGap = ruleById.get(id)!.family === "ligne" ? 2 : 3;
        if (last !== undefined) {
          expect(day - last, `${id} @ ${grid.date}`).toBeGreaterThanOrEqual(minGap);
        }
        lastSeen.set(id, day);
      }
    });
  });

  it("aucune combinaison de 6 règles ne se répète sur l'année", () => {
    const signatures = series.map((g) => [...g.rows, ...g.cols].sort().join("|"));
    expect(new Set(signatures).size).toBe(YEAR);
  });

  it("la plupart des règles du catalogue servent dans l'année", () => {
    const used = new Set(series.flatMap((g) => [...g.rows, ...g.cols]));
    expect(used.size).toBeGreaterThanOrEqual(rules.length * 0.85);
  });

  it("difficulté répartie (pas que du trivial, pas que du difficile)", () => {
    const easy = series.filter((g) => g.difficulty < 1).length;
    const hard = series.filter((g) => g.difficulty > 1.8).length;
    expect(easy).toBeGreaterThan(YEAR * 0.05);
    expect(hard).toBeGreaterThan(YEAR * 0.05);
  });
});
