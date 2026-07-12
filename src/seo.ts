/**
 * Métadonnées <head> par écran. La grille du jour vit sur « / » avec les métas par
 * défaut d'index.html ; les autres écrans ont une vraie URL, donc leur propre
 * title/description/canonical pour être indexés comme des pages distinctes. Les
 * grilles passées (/archive/<date>) restent en noindex.
 *
 * Rendu 100 % côté client : ces métas s'appliquent après le rendu JS. Le HTML brut de
 * toutes les routes porte les métas de la home ; Googlebot les met à jour au rendu. Le
 * contenu réellement crawlable sans JS vit dans le <footer id="seo-content"> d'index.html.
 */
import { pathFor } from "./routes.ts";

const ORIGIN = "https://tamdoku.fr";
const DEFAULT_ROBOTS = "index, follow, max-image-preview:large";

type ScreenMeta = { title: string; description: string };

const HOME: ScreenMeta = {
  title: "Tamdoku — le puzzle quotidien du tram de Montpellier",
  description:
    "Le puzzle quotidien du tramway de Montpellier : remplissez la grille 3×3 avec les stations qui cochent le critère de leur ligne et de leur colonne. Une nouvelle grille chaque jour, gratuite, sans compte.",
};

const META: Record<string, ScreenMeta> = {
  rules: {
    title: "Comment jouer à Tamdoku — les règles du sudoku du tram de Montpellier",
    description:
      "Les règles de Tamdoku : une grille 3×3 où chaque ligne et chaque colonne impose un critère (ligne de tram, terminus, correspondance, commune, lettre du nom…). Remplissez chaque case avec une station TaM qui satisfait les deux, sans réutiliser de station. 3 erreurs maximum.",
  },
  about: {
    title: "À propos de Tamdoku — le sudoku du tram de Montpellier (TaM)",
    description:
      "Tamdoku est un hommage ludique au réseau de tramway de Montpellier et à ses 5 lignes TaM, dans l'esprit d'UbahnDoku. Projet indépendant et non officiel My-Monkey, bâti sur les données ouvertes OpenStreetMap et le GTFS TaM.",
  },
  stats: {
    title: "Statistiques — Tamdoku, le puzzle quotidien du tram de Montpellier",
    description:
      "Vos statistiques Tamdoku : parties jouées, meilleur score d'originalité et série de victoires en cours.",
  },
  archive: {
    title: "Archive des grilles — Tamdoku, le puzzle quotidien du tram de Montpellier",
    description:
      "Rejouez les grilles passées de Tamdoku, le sudoku quotidien des stations du tram de Montpellier.",
  },
};

function set(selector: string, attr: string, value: string): void {
  document.querySelector(selector)?.setAttribute(attr, value);
}

/** Aligne title, description, canonical, robots et OpenGraph sur l'écran courant. */
export function applyRouteMeta(screen: string, game: string, puzzleDate: string): void {
  const path = pathFor(screen, game, puzzleDate);
  const onArchiveDate = screen === "game" && game === "archive";

  let meta = META[screen] ?? HOME;
  let robots = DEFAULT_ROBOTS;
  if (onArchiveDate) {
    // Grille datée : titre partageable mais hors index (contenu quasi dupliqué jour après jour).
    meta = { title: `Grille du ${puzzleDate} — Tamdoku`, description: HOME.description };
    robots = "noindex, follow";
  }

  const url = `${ORIGIN}${path}`;
  document.title = meta.title;
  set('meta[name="description"]', "content", meta.description);
  set('link[rel="canonical"]', "href", url);
  set('meta[name="robots"]', "content", robots);
  set('meta[property="og:title"]', "content", meta.title);
  set('meta[property="og:description"]', "content", meta.description);
  set('meta[property="og:url"]', "content", url);
}
