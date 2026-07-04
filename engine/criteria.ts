/**
 * Le pool de critères « grand public » du jeu quotidien, mappé sur les vraies
 * règles de l'engine, avec les libellés, icônes et explications de l'interface.
 *
 * On garde le parti pris éditorial de la maquette : neuf critères évocateurs
 * (les cinq lignes + terminus, correspondance, hors Montpellier, nom propre),
 * plutôt que les ~40 règles mécaniques du catalogue complet. Les textes des
 * lignes sont générés depuis les terminus réels du réseau — pas de copie
 * périmée (la L1 va désormais à Gare Sud de France, plus à Odysseum).
 */
import { stationById } from "./select.ts";
import type { CompiledRule, LineRef, Network } from "./types.ts";

export interface Criterion {
  ruleId: string;
  kind: "line" | "attr";
  /** Numéro de ligne pour les pastilles colorées. */
  n?: number;
  valClass: string;
  icon: string;
  short: string;
  label: string;
  expl: string;
}

/** Ids des règles de l'engine composant le pool quotidien, dans l'ordre d'affichage. */
export const DAILY_POOL_IDS = [
  "ligne-1",
  "ligne-2",
  "ligne-3",
  "ligne-4",
  "ligne-5",
  "terminus",
  "correspondance",
  "geo-hors-montpellier",
  "tag-personnalite",
] as const;

/** Habillage artistique de chaque ligne (identité TaM), complété par les terminus réels. */
const LINE_FLAVOR: Record<LineRef, string> = {
  "1": "la ligne bleue aux hirondelles de Garouste & Bonetti",
  "2": "la ligne des fleurs",
  "3": "l’univers marin de Christian Lacroix",
  "4": "la circulaire dorée autour de l’Écusson",
  "5": "la ligne des Parcs, la Feuille de Vie de Barthélémy Toguo",
};

export function terminiPhrase(net: Network, ref: LineRef): string {
  const byId = stationById(net);
  const line = net.lines.find((l) => l.ref === ref);
  if (!line || line.circular) return "circulaire";
  const names = line.termini.map((id) => byId.get(id)?.name ?? id);
  if (names.length <= 2) return names.join(" ↔ ");
  return `${names[0]} ↔ ${names.slice(1).join(" / ")}`;
}

export function buildCriteria(net: Network): Map<string, Criterion> {
  const map = new Map<string, Criterion>();

  for (const ref of ["1", "2", "3", "4", "5"] as LineRef[]) {
    const n = Number(ref);
    const where = terminiPhrase(net, ref);
    const expl =
      ref === "4"
        ? `La station est desservie par la ligne 4, ${LINE_FLAVOR["4"]}.`
        : `La station est desservie par la ligne ${ref} (${where}), ${LINE_FLAVOR[ref]}.`;
    map.set(`ligne-${ref}`, {
      ruleId: `ligne-${ref}`,
      kind: "line",
      n,
      valClass: `v${ref}`,
      icon: "",
      short: `Ligne ${ref}`,
      label: `Ligne ${ref}`,
      expl,
    });
  }

  const attrs: Criterion[] = [
    {
      ruleId: "terminus",
      kind: "attr",
      valClass: "",
      icon: "⇥",
      short: "Terminus",
      label: "Terminus",
      expl: "La station est un terminus : le départ ou l’arrivée d’une ligne (Mosson, Gare Sud de France, Jacou, Juvignac, Clapiers…). La ligne 4, circulaire, n’en a pas.",
    },
    {
      ruleId: "correspondance",
      kind: "attr",
      valClass: "",
      icon: "⇄",
      short: "Corresp.",
      label: "Correspondance",
      expl: "Au moins deux lignes de tram s’arrêtent à cette station (Gare Saint-Roch, Corum, Comédie, Gambetta…).",
    },
    {
      ruleId: "geo-hors-montpellier",
      kind: "attr",
      valClass: "",
      icon: "⌖",
      short: "Hors Mtp",
      label: "Hors Montpellier",
      expl: "La station se trouve dans une autre commune de la métropole : Jacou, Castelnau-le-Lez, Juvignac, Saint-Jean-de-Védas, Lattes, Pérols, Clapiers, Montferrier-sur-Lez.",
    },
    {
      ruleId: "tag-personnalite",
      kind: "attr",
      valClass: "",
      icon: "☺",
      short: "Nom propre",
      label: "Nom propre",
      expl: "La station porte le nom d’une personnalité : Léon Blum, Gambetta, Charles de Gaulle, Garcia Lorca, Voltaire, Jules Guesde… Les saints ne comptent pas.",
    },
  ];
  for (const c of attrs) map.set(c.ruleId, c);

  return map;
}

/** Les règles compilées du pool quotidien, dans l'ordre d'affichage. */
export function dailyPool(rules: CompiledRule[]): CompiledRule[] {
  const byId = new Map(rules.map((r) => [r.id, r]));
  return DAILY_POOL_IDS.map((id) => {
    const rule = byId.get(id);
    if (!rule) throw new Error(`Règle du pool quotidien absente du catalogue : ${id}`);
    return rule;
  });
}
