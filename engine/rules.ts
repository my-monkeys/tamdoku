/**
 * Construit le catalogue de règles compilées contre un réseau donné.
 * Le catalogue est en partie dynamique (lettres, communes) : une règle n'est
 * conservée que si son nombre de stations reste dans une bande jouable —
 * assez de réponses pour remplir une ligne de grille, pas au point d'être triviale.
 */
import { metersBetween } from "./geo.ts";
import {
  containsLetter,
  endsWithVowel,
  fold,
  hasAccent,
  hasApostrophe,
  hasDigit,
  hasDoubleLetter,
  letterCount,
  slugify,
  startsWithVowel,
  words,
} from "./text.ts";
import type { CompiledRule, Network, Rule, Station } from "./types.ts";

/** Bande de jouabilité générale (sur ~110 stations). */
const MIN_STATIONS = 6;
const MAX_STATIONS = 88;
/** Les règles-lettres sont des « bouche-trous » : bande plus stricte. */
const LETTER_MIN = 12;
const LETTER_MAX = 66;

const NEAR_CENTER_METERS = 1_500;
const FAR_CENTER_METERS = 5_000;

export function buildRules(net: Network): CompiledRule[] {
  const rules: Rule[] = [];

  // ── Lignes ──────────────────────────────────────────────────────────────
  for (const line of net.lines) {
    rules.push({
      id: `ligne-${line.ref}`,
      family: "ligne",
      subfamily: "ligne",
      label: `Sur la ligne ${line.ref}`,
      description: `La ligne ${line.ref} (${line.name}) s'arrête à cette station. Seules les lignes directes comptent — pas les correspondances.`,
      test: (s) => s.lines.includes(line.ref),
    });
  }

  // ── Réseau ──────────────────────────────────────────────────────────────
  rules.push(
    {
      id: "correspondance",
      family: "reseau",
      subfamily: "correspondance",
      label: "Station de correspondance",
      description: "Au moins deux lignes de tramway s'arrêtent à cette station.",
      test: (s) => s.lines.length >= 2,
    },
    {
      id: "ligne-unique",
      family: "reseau",
      subfamily: "correspondance",
      label: "Une seule ligne",
      description: "Une seule ligne de tramway s'arrête à cette station.",
      test: (s) => s.lines.length === 1,
    },
    {
      id: "terminus",
      family: "reseau",
      subfamily: "terminus",
      label: "Terminus d'une ligne",
      description:
        "Cette station est le terminus d'au moins une ligne (la ligne 4 est circulaire et n'a pas de terminus).",
      test: (s) => s.terminusOf.length > 0,
    },
    {
      id: "p-tram",
      family: "reseau",
      subfamily: "p-tram",
      label: "Dessert un P+Tram",
      description: "Un parking relais P+Tram se trouve à cette station.",
      test: (s) => s.parkRide,
    },
  );

  // ── Nom : lettres (dynamique, bande stricte) ────────────────────────────
  for (const letter of "abcdefghijklmnopqrstuvwxyz") {
    const count = net.stations.filter((s) => containsLetter(s.name, letter)).length;
    if (count < LETTER_MIN || count > LETTER_MAX) continue;
    rules.push({
      id: `nom-lettre-${letter}`,
      family: "nom",
      subfamily: "contient-lettre",
      label: `Contient un « ${letter.toUpperCase()} »`,
      description: `Le nom de la station contient la lettre ${letter.toUpperCase()}, accentuée ou non, peu importe la casse.`,
      test: (s) => containsLetter(s.name, letter),
    });
  }

  // ── Nom : structure ─────────────────────────────────────────────────────
  rules.push(
    {
      id: "nom-commence-voyelle",
      family: "nom",
      subfamily: "voyelle",
      label: "Commence par une voyelle",
      description: "La première lettre du nom est une voyelle (A, E, I, O, U, Y).",
      test: (s) => startsWithVowel(s.name),
    },
    {
      id: "nom-finit-voyelle",
      family: "nom",
      subfamily: "voyelle",
      label: "Se termine par une voyelle",
      description: "La dernière lettre du nom est une voyelle (A, E, I, O, U, Y).",
      test: (s) => endsWithVowel(s.name),
    },
    {
      id: "nom-saint",
      family: "nom",
      subfamily: "mot",
      label: "Contient « Saint »",
      description: "Le nom contient le mot « Saint » (Saint-Éloi, Gare Saint-Roch, …).",
      test: (s) => /\bsaint\b/.test(fold(s.name).replace(/-/g, " ")),
    },
    {
      id: "nom-accent",
      family: "nom",
      subfamily: "typographie",
      label: "Contient un accent",
      description: "Le nom officiel contient au moins une lettre accentuée (é, è, ô, …).",
      test: (s) => hasAccent(s.name),
    },
    {
      id: "nom-apostrophe",
      family: "nom",
      subfamily: "typographie",
      label: "Contient une apostrophe",
      description: "Le nom officiel contient une apostrophe (Château d'Ô, Place de l'Europe, …).",
      test: (s) => hasApostrophe(s.name),
    },
    {
      id: "nom-double-lettre",
      family: "nom",
      subfamily: "double-lettre",
      label: "Contient une lettre doublée",
      description:
        "Deux lettres identiques se suivent dans le nom, en ignorant espaces et tirets (Mosson, Tonnelles, …).",
      test: (s) => hasDoubleLetter(s.name),
    },
    {
      id: "nom-chiffre",
      family: "nom",
      subfamily: "chiffre",
      label: "Contient un chiffre",
      description: "Le nom contient un chiffre (Mondial 98, Albert 1er, Place du 8 Mai 1945, …).",
      test: (s) => hasDigit(s.name),
    },
    {
      id: "nom-long",
      family: "nom",
      subfamily: "longueur",
      label: "Nom long (18 lettres ou plus)",
      description: "Le nom compte au moins 18 lettres, sans les espaces ni la ponctuation.",
      test: (s) => letterCount(s.name) >= 18,
    },
    {
      id: "nom-court",
      family: "nom",
      subfamily: "longueur",
      label: "Nom court (8 lettres ou moins)",
      description: "Le nom compte au plus 8 lettres, sans les espaces ni la ponctuation.",
      test: (s) => letterCount(s.name) <= 8,
    },
    {
      id: "nom-un-mot",
      family: "nom",
      subfamily: "mots",
      label: "Nom d'un seul mot",
      description: "Le nom tient en un seul mot (Comédie, Odysseum, Jacou, …).",
      test: (s) => words(s.name).length === 1,
    },
    {
      id: "nom-trois-mots",
      family: "nom",
      subfamily: "mots",
      label: "Nom d'au moins 3 mots",
      description:
        "Le nom compte au moins trois mots, séparés par des espaces, tirets ou apostrophes.",
      test: (s) => words(s.name).length >= 3,
    },
  );

  // ── Sémantique (tags curés dans pipeline/curation.json) ─────────────────
  const tagRules: [string, string, string][] = [
    [
      "personnalite",
      "Porte le nom d'une personnalité",
      "La station est nommée d'après une personne réelle (Léon Blum, Garcia Lorca, Gambetta, …). Les saints ne comptent pas.",
    ],
    [
      "espace-vert",
      "Évoque un espace vert",
      "Le nom évoque un parc, jardin, zoo ou domaine (Parc Bagatelle, Jardin des Plantes, Zoo de Lunaret, …).",
    ],
    [
      "sport",
      "Évoque le sport",
      "Le nom évoque le sport : stades, rugby, coupe du monde (Stade de la Mosson, Ovalie, Mondial 98, …).",
    ],
    [
      "enseignement",
      "Évoque études ou recherche",
      "Le nom évoque l'enseignement supérieur ou la recherche (Université, Pôle Chimie, CNRS, Agropolis, …).",
    ],
  ];
  for (const [tag, label, description] of tagRules) {
    rules.push({
      id: `tag-${tag}`,
      family: "semantique",
      subfamily: tag,
      label,
      description,
      test: (s) => s.tags.includes(tag),
    });
  }

  // ── Géographie ──────────────────────────────────────────────────────────
  rules.push(
    {
      id: "geo-montpellier",
      family: "geo",
      subfamily: "commune",
      label: "Dans Montpellier",
      description: "La station se trouve sur la commune de Montpellier.",
      test: (s) => s.commune === "Montpellier",
    },
    {
      id: "geo-hors-montpellier",
      family: "geo",
      subfamily: "commune",
      label: "Hors de Montpellier",
      description:
        "La station se trouve dans une autre commune de la métropole (Lattes, Castelnau-le-Lez, Jacou, …).",
      test: (s) => s.commune !== "Montpellier",
    },
  );

  const communeCounts = new Map<string, number>();
  for (const s of net.stations) {
    communeCounts.set(s.commune, (communeCounts.get(s.commune) ?? 0) + 1);
  }
  for (const [commune, count] of communeCounts) {
    if (commune === "Montpellier" || count < 6) continue;
    rules.push({
      id: `geo-commune-${slugify(commune)}`,
      family: "geo",
      subfamily: "commune",
      label: `À ${commune}`,
      description: `La station se trouve sur la commune de ${commune}.`,
      test: (s) => s.commune === commune,
    });
  }

  const comedie = net.stations.find((s) => s.id === "comedie");
  if (!comedie) throw new Error("Station de référence « comedie » introuvable");
  const center = { lat: comedie.lat, lon: comedie.lon };
  const compass: [string, string, (s: Station) => boolean][] = [
    ["nord", "au nord de", (s) => s.lat > center.lat],
    ["sud", "au sud de", (s) => s.lat < center.lat],
    ["est", "à l'est de", (s) => s.lon > center.lon],
    ["ouest", "à l'ouest de", (s) => s.lon < center.lon],
  ];
  for (const [dir, phrase, test] of compass) {
    rules.push({
      id: `geo-${dir}-comedie`,
      family: "geo",
      subfamily: "boussole",
      label: `Plus ${phrase.split(" ")[0] === "à" ? `à l'${dir}` : `au ${dir}`} que la Comédie`,
      description: `La station se trouve ${phrase} la station Comédie sur la carte.`,
      test,
    });
  }
  rules.push(
    {
      id: "geo-proche-comedie",
      family: "geo",
      subfamily: "distance",
      label: "À moins de 1,5 km de la Comédie",
      description:
        "La station est à moins de 1,5 km à vol d'oiseau de la station Comédie — l'hyper-centre.",
      test: (s) => metersBetween(s, center) < NEAR_CENTER_METERS,
    },
    {
      id: "geo-loin-comedie",
      family: "geo",
      subfamily: "distance",
      label: "À plus de 5 km de la Comédie",
      description: "La station est à plus de 5 km à vol d'oiseau de la station Comédie.",
      test: (s) => metersBetween(s, center) > FAR_CENTER_METERS,
    },
  );

  // ── Compilation + garde de jouabilité ────────────────────────────────────
  const compiled: CompiledRule[] = [];
  for (const rule of rules) {
    const stationIds = new Set(net.stations.filter(rule.test).map((s) => s.id));
    const inBand = stationIds.size >= MIN_STATIONS && stationIds.size <= MAX_STATIONS;
    // Les règles ligne/commune dédiée sont structurelles : jamais filtrées par le haut.
    const structural = rule.family === "ligne";
    if (inBand || (structural && stationIds.size >= MIN_STATIONS)) {
      compiled.push({ ...rule, stationIds });
    }
  }

  const ids = new Set(compiled.map((r) => r.id));
  if (ids.size !== compiled.length) throw new Error("Ids de règles en double");
  return compiled;
}
