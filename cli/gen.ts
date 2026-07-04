/**
 * Prévisualisation de grilles en terminal.
 *   npm run gen                          → grille du jour
 *   npm run gen -- --date 2026-07-10    → grille d'une date
 *   npm run gen -- --days 30            → tableau récap des 30 premières grilles
 */
import { loadNetwork, stationById } from "../engine/network.ts";
import { buildRules } from "../engine/rules.ts";
import { EPOCH, dateOfDayIndex, generateSeries, puzzleForDate } from "../engine/generator.ts";
import type { Grid } from "../engine/types.ts";

const net = loadNetwork();
const rules = buildRules(net);
const ruleById = new Map(rules.map((r) => [r.id, r]));
const stations = stationById(net);

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

function printGrid(grid: Grid): void {
  console.log(`\nTamdoku #${grid.number} — ${grid.date} (difficulté ${grid.difficulty})\n`);
  const label = (id: string) => ruleById.get(id)!.label;
  const colWidth = 30;
  console.log(
    " ".repeat(colWidth) + grid.cols.map((c) => label(c).padEnd(colWidth)).join(""),
  );
  grid.rows.forEach((rowId, i) => {
    const cells = grid.cols.map((_, j) => {
      const cell = grid.solutions[i]![j]!;
      return `[${cell.length} sol.]`.padEnd(colWidth);
    });
    console.log(label(rowId).padEnd(colWidth) + cells.join(""));
  });
  console.log("\nExemples de solutions :");
  grid.rows.forEach((_, i) => {
    grid.cols.forEach((_, j) => {
      const cell = grid.solutions[i]![j]!;
      const names = cell.slice(0, 4).map((id) => stations.get(id)!.name);
      console.log(
        `  (${i + 1},${j + 1}) ${String(cell.length).padStart(2)} → ${names.join(" · ")}${cell.length > 4 ? " · …" : ""}`,
      );
    });
  });
}

const days = flag("days");
if (days) {
  const grids = generateSeries(net, rules, Number(days));
  for (const grid of grids) {
    const all = [...grid.rows, ...grid.cols].map((id) => ruleById.get(id)!.label).join(" | ");
    const min = Math.min(...grid.solutions.flat().map((c) => c.length));
    console.log(
      `#${String(grid.number).padStart(3)} ${grid.date} diff=${String(grid.difficulty).padEnd(5)} min=${min}  ${all}`,
    );
  }
} else {
  const date = flag("date") ?? new Date().toISOString().slice(0, 10);
  const effective = date < EPOCH ? dateOfDayIndex(0) : date;
  printGrid(puzzleForDate(net, rules, effective));
}
