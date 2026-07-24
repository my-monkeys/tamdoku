/**
 * Métadonnées d'affichage (icône, libellé court pour la grille, libellé long et
 * explication pour le « ? ») pour **toutes** les règles du catalogue, pas juste
 * un sous-ensemble : la maquette n'exposait que 9 critères à but démonstratif,
 * le jeu utilise désormais l'ensemble.
 *
 * Règle d'écriture : **aucune explication ne cite de station en exemple** (ce
 * serait donner des réponses). Les textes des lignes s'appuient sur l'habillage
 * de la ligne, pas sur ses stations.
 */
import { stationById } from "./select.ts";
import type { CompiledRule, LineRef, Network } from "./types.ts";

export interface Criterion {
  ruleId: string;
  kind: "line" | "attr";
  /** Numéro de ligne (pastille colorée) pour les critères « ligne ». */
  n?: number;
  valClass: string;
  /** Repère typographique (lettre, « St », « 18+ »…) quand il EST le critère. */
  icon: string;
  /** Clé d'icône SVG (cf. components/icons.tsx) pour les critères conceptuels. */
  iconKey?: string;
  /** Libellé compact affiché dans la case d'en-tête de la grille. */
  short: string;
  /** Libellé complet affiché en titre du « ? ». */
  label: string;
  expl: string;
}

/** Habillage artistique de chaque ligne (identité TaM), sans nommer de station. */
const LINE_FLAVOR: Record<LineRef, string> = {
  "1": "la ligne bleue aux hirondelles de Garouste & Bonetti",
  "2": "la ligne orange, dite « des fleurs »",
  "3": "la ligne verte, l’univers marin de Christian Lacroix",
  "4": "la circulaire dorée autour de l’Écusson",
  "5": "la ligne magenta des Parcs, la Feuille de Vie de Barthélémy Toguo",
};

/** Métadonnées des règles fixes (hors lignes, lettres et communes, générées). */
const META: Record<string, { icon: string; iconKey?: string; short: string; label: string; expl: string }> = {
  // Réseau
  correspondance: {
    icon: "⇄",
    iconKey: "swap",
    short: "Corresp.",
    label: "Correspondance",
    expl: "Au moins deux lignes de tram s’arrêtent à cette station.",
  },
  terminus: {
    icon: "⇥",
    iconKey: "terminus",
    short: "Terminus",
    label: "Terminus",
    expl: "La station est le départ ou l’arrivée d’une ligne (la ligne 4, circulaire, part et revient à son terminus).",
  },
  // Nom — structure
  // Pas de lettre en icône : un « A » laisserait croire qu'il faut une station
  // commençant par A. On affiche le libellé en toutes lettres.
  "nom-commence-voyelle": {
    icon: "",
    short: "Voyelle au début",
    label: "Commence par une voyelle",
    expl: "La première lettre du nom est une voyelle (a, e, i, o, u, y).",
  },
  "nom-finit-voyelle": {
    icon: "",
    short: "Voyelle à la fin",
    label: "Se termine par une voyelle",
    expl: "La dernière lettre du nom est une voyelle (a, e, i, o, u, y).",
  },
  "nom-saint": {
    icon: "St",
    short: "« Saint »",
    label: "Contient « Saint »",
    expl: "Le nom contient le mot « Saint ».",
  },
  "nom-accent": {
    icon: "é",
    short: "Un accent",
    label: "Contient un accent",
    expl: "Le nom contient au moins une lettre accentuée (é, è, ô, ï…).",
  },
  "nom-apostrophe": {
    icon: "’",
    short: "Apostrophe",
    label: "Contient une apostrophe",
    expl: "Le nom contient une apostrophe.",
  },
  "nom-double-lettre": {
    icon: "aa",
    short: "Lettre doublée",
    label: "Contient une lettre doublée",
    expl: "Un mot du nom contient deux fois la même lettre, collées (ll, ss, nn…). Deux lettres identiques séparées ne comptent pas.",
  },
  "nom-chiffre": {
    icon: "#",
    iconKey: "hash",
    short: "Un chiffre",
    label: "Contient un chiffre",
    expl: "Le nom contient un chiffre.",
  },
  "nom-long": {
    icon: "18+",
    short: "Nom long",
    label: "Nom long",
    expl: "Le nom compte au moins 18 lettres, hors espaces et ponctuation.",
  },
  "nom-court": {
    icon: "≤8",
    short: "Nom court",
    label: "Nom court",
    expl: "Le nom compte au plus 8 lettres, hors espaces et ponctuation.",
  },
  "nom-un-mot": {
    icon: "1",
    short: "Un seul mot",
    label: "Nom d’un seul mot",
    expl: "Le nom tient en un seul mot.",
  },
  "nom-trois-mots": {
    icon: "3+",
    short: "3 mots et +",
    label: "Nom d’au moins 3 mots",
    expl: "Le nom compte au moins trois mots.",
  },
  // Sémantique
  "tag-personnalite": {
    icon: "☺",
    iconKey: "user",
    short: "Personnalité",
    label: "Nom d'une personnalité",
    expl: "La station porte le nom d'une personne réelle, y compris au sein d'un nom composé (université, stade, parc…). Les saints ne comptent pas.",
  },
  "tag-espace-vert": {
    icon: "✿",
    iconKey: "tree",
    short: "Espace vert",
    label: "Espace vert",
    expl: "Le nom évoque un parc, un jardin, un zoo ou un domaine.",
  },
  "tag-enseignement": {
    icon: "✎",
    iconKey: "cap",
    short: "Études",
    label: "Études & recherche",
    expl: "Le nom évoque l’enseignement supérieur ou la recherche.",
  },
  // Géographie
  "geo-montpellier": {
    icon: "⌂",
    iconKey: "building",
    short: "Montpellier",
    label: "Dans Montpellier",
    expl: "La station se trouve sur la commune de Montpellier.",
  },
  "geo-hors-montpellier": {
    icon: "⌖",
    iconKey: "signpost",
    short: "Hors Mtp",
    label: "Hors Montpellier",
    expl: "La station se trouve hors de la ville de Montpellier, dans une autre commune de la métropole.",
  },
  "geo-nord-comedie": {
    icon: "↑",
    iconKey: "arrowUp",
    short: "Nord",
    label: "Au nord du centre",
    expl: "La station est située au nord du centre-ville.",
  },
  "geo-sud-comedie": {
    icon: "↓",
    iconKey: "arrowDown",
    short: "Sud",
    label: "Au sud du centre",
    expl: "La station est située au sud du centre-ville.",
  },
  "geo-est-comedie": {
    icon: "→",
    iconKey: "arrowRight",
    short: "Est",
    label: "À l’est du centre",
    expl: "La station est située à l’est du centre-ville.",
  },
  "geo-ouest-comedie": {
    icon: "←",
    iconKey: "arrowLeft",
    short: "Ouest",
    label: "À l’ouest du centre",
    expl: "La station est située à l’ouest du centre-ville.",
  },
  "geo-proche-comedie": {
    icon: "◉",
    iconKey: "target",
    short: "Près du centre",
    label: "Proche du centre",
    expl: "La station est à moins de 1,5 km à vol d’oiseau du centre-ville.",
  },
  "geo-loin-comedie": {
    icon: "◌",
    iconKey: "expand",
    short: "Loin du centre",
    label: "Loin du centre",
    expl: "La station est à plus de 5 km à vol d’oiseau du centre-ville.",
  },
};

function criterionFor(rule: CompiledRule): Criterion {
  if (rule.family === "ligne") {
    const ref = rule.id.slice(-1) as LineRef;
    return {
      ruleId: rule.id,
      kind: "line",
      n: Number(ref),
      valClass: `v${ref}`,
      icon: "",
      short: `Ligne ${ref}`,
      label: `Ligne ${ref}`,
      expl: `La station est desservie par la ligne ${ref}, ${LINE_FLAVOR[ref]}.`,
    };
  }
  if (rule.subfamily === "contient-lettre") {
    const letter = rule.id.slice("nom-lettre-".length).toUpperCase();
    return {
      ruleId: rule.id,
      kind: "attr",
      valClass: "",
      icon: letter,
      short: "dans le nom",
      label: `Contient un « ${letter} »`,
      expl: `Le nom de la station contient la lettre ${letter}, accentuée ou non.`,
    };
  }
  if (rule.id.startsWith("geo-commune-")) {
    const commune = rule.label.replace(/^À\s+/, "");
    return {
      ruleId: rule.id,
      kind: "attr",
      valClass: "",
      icon: "⚑",
      iconKey: "pin",
      short: commune,
      label: `À ${commune}`,
      expl: `La station se trouve sur la commune de ${commune}.`,
    };
  }
  const m = META[rule.id];
  if (!m) throw new Error(`Critère sans métadonnée d'affichage : ${rule.id}`);
  return { ruleId: rule.id, kind: "attr", valClass: "", ...m };
}

/** Métadonnées d'affichage pour toutes les règles fournies. */
export function buildCriteria(rules: CompiledRule[]): Map<string, Criterion> {
  return new Map(rules.map((r) => [r.id, criterionFor(r)]));
}

/** Terminus d'une ligne en texte, pour l'écran « À propos » (boucle pour la L4). */
export function terminiPhrase(net: Network, ref: LineRef): string {
  const byId = stationById(net);
  const line = net.lines.find((l) => l.ref === ref);
  if (!line) return "";
  const names = line.termini.map((id) => byId.get(id)?.name ?? id);
  if (line.circular) return names.length ? `boucle depuis ${names[0]}` : "circulaire";
  if (names.length <= 2) return names.join(" ↔ ");
  return `${names[0]} ↔ ${names.slice(1).join(" / ")}`;
}
