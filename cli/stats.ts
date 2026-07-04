/** Tableau de couverture des règles + statistiques de compatibilité entre paires. */
import { loadNetwork, stationById } from "../engine/network.ts";
import { buildRules } from "../engine/rules.ts";

const net = loadNetwork();
const rules = buildRules(net);
const byId = stationById(net);

console.log(`${net.stations.length} stations — ${rules.length} règles\n`);

let currentFamily = "";
for (const rule of rules) {
  if (rule.family !== currentFamily) {
    currentFamily = rule.family;
    console.log(`── ${currentFamily} ──`);
  }
  const sample = [...rule.stationIds]
    .slice(0, 3)
    .map((id) => byId.get(id)!.name)
    .join(", ");
  console.log(`  ${rule.id.padEnd(28)} ${String(rule.stationIds.size).padStart(3)}  ex: ${sample}`);
}

// Compatibilité : une paire (règle A, règle B) est utilisable en croisement si
// leur intersection contient au moins 2 stations (marge pour la non-réutilisation).
let pairs = 0;
let compatible = 0;
const intersection = (a: ReadonlySet<string>, b: ReadonlySet<string>) => {
  let n = 0;
  for (const id of a) if (b.has(id)) n++;
  return n;
};
for (let i = 0; i < rules.length; i++) {
  for (let j = i + 1; j < rules.length; j++) {
    pairs++;
    if (intersection(rules[i]!.stationIds, rules[j]!.stationIds) >= 2) compatible++;
  }
}
console.log(
  `\nPaires de règles : ${pairs}, compatibles (∩ ≥ 2) : ${compatible} (${Math.round((100 * compatible) / pairs)} %)`,
);
