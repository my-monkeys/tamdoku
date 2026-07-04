# CLAUDE.md — tamdoku

Puzzle quotidien du tram de Montpellier (clone d'ubahndoku.de). **App jouable de bout en bout** (données + moteur + UI). Lire `docs/superpowers/specs/2026-07-04-tamdoku-design.md` avant de toucher au moteur.

## Stack & couches

- **`engine/`** — lib TypeScript pure, **browser-safe** (aucun accès réseau/fs sauf `network.ts`, réservé à Node/CLI ; l'app importe `data/network.json` directement et ne touche jamais `network.ts`). Zéro dépendance runtime.
- **`src/`** — app **Vite + React + TS**, mobile-first, portée de la maquette Claude Design (`design/Tamdoku.dc.html`). CSS repris **verbatim** dans `src/styles.css`. Logique du jeu dans `src/useGame.ts` (port de la classe `DCLogic`), câblée à l'engine.
- **`pipeline/` / `cli/`** — Node (tsx).

### Câblage app ↔ engine (décision clé)

La maquette embarquait son propre prototype de données (~53 stations, quelques erreurs) et son générateur. L'app **remplace ça par le vrai engine** : `data/network.json` (110 stations OSM/GTFS), `engine/daily.ts` (grille du jour déterministe), `engine/criteria.ts` (les **9 mêmes critères évocateurs** que la maquette, mappés aux vraies règles, copie corrigée sur les terminus réels), `engine/fame.ts` (notoriété → score d'originalité + tri des suggestions), `engine/answer.ts` (résolution de saisie). On garde donc le rendu de la maquette mais des données exactes.

- Deux générateurs coexistent : `engine/daily.ts` (date-seedé, indépendant, petit pool — **utilisé par l'app**) et `engine/generator.ts` (série anti-répétition sur le pool complet — pour une future archive). Ne pas confondre.
- Deux tsconfig : racine (Node, `engine/pipeline/cli/test/*.ts`) + `tsconfig.app.json` (DOM+JSX, `src` + `test/**/*.tsx`). `npm run typecheck` lance les deux.

## Invariants à ne pas casser

- **La grille du jour est déterministe par date** (`engine/daily.ts` + `seedForDate`) : même date → même grille pour tout le monde, calculée côté client. Ne pas changer la façon de dériver la graine après le lancement, sinon les grilles passées changent. (`engine/generator.ts` garde en plus un `EPOCH = "2026-07-06"` figé pour la future série d'archive.)
- La desserte vient d'**OSM (réseau nominal)**, jamais de l'union des trips GTFS : le GTFS contient les déviations travaux (été 2026 : L1 via Peyrou, L2 via Les Aubes, L4 via Antigone). Le GTFS ne sert qu'à l'identité/alias/couleurs.
- Stations distinctes comme sur le plan officiel (les deux Gare Saint-Roch, les deux Albert 1er, les deux Saint-Éloi) ; seuls les quais directionnels fusionnent (Gambetta ×3 → 1), via `pipeline/curation.json`.
- Toute règle du catalogue doit couvrir 6–88 stations (12–66 pour les lettres) — garde automatique dans `buildRules`.

## Rafraîchir les données

```bash
npm run build:data   # OSM + GTFS + communes → data/network.json
npm test             # les invariants réseau + 365 jours de grilles revalidés
```

Puis **lire le rapport de croisement OSM↔GTFS** affiché par le build : chaque divergence doit être soit une déviation travaux connue, soit corrigée (curation ou signalement OSM). Les snapshots `data/raw/*.json` sont committés (builds reproductibles) ; le zip GTFS et son extraction ne le sont pas.

## Gotchas

- Overpass renvoie **406** sans User-Agent identifiable (déjà géré dans `fetch-osm.ts`).
- Les tags OSM peuvent contenir des doubles espaces (« Boutonnet  - Cité des Arts ») — toujours passer par la normalisation whitespace du build.
- `curation.json` : les clés de `merges`/`renames` sont des noms OSM bruts, les `tags`/`parkRideOverrides` des slugs canoniques. Un slug inconnu fait échouer le build (typo-guard volontaire).
- Le GTFS TaM (juin 2026) nomme la station « Saint-Martin » alors que la signalétique (et OSM) dit « Saint-Martin - Le Jam » → `gtfsAliases`.

## App : gotchas UI

- Le CSS de `src/styles.css` est **verbatim de la maquette** — pour un changement visuel, éditer `src/` (pas `design/Tamdoku.dc.html`, qui n'est que la référence).
- La grille CSS `.grid3` est plate (16 cellules en flux) : la ligne d'en-tête + ses 3 cases sont émises sans wrapper (`RowFragment`), sinon la grille casse.
- Thème clair/sombre suivi de `prefers-color-scheme` (classe `dark` sur `.app`, `dark-page` sur `body`).
- Vérif sans navigateur : `test/app.integration.test.tsx` (jsdom) monte l'app et joue une grille complète jusqu'à la victoire — c'est le filet de sécurité du portage. **Encore à faire : une passe visuelle en vrai navigateur** (l'extension Chrome n'était pas connectée au moment du build).

## Déploiement

Vite SPA : `npm run build` → `dist/` → `.monkey` (`source: ./dist/`, target **`tamdoku.fr`** — domaine dédié, pas un sous-domaine `my-monkey.fr` ; O2switch doit avoir le vhost `tamdoku.fr`). Confirmer le deploy via l'API admin monkey (`status: success`), cf. CLAUDE.md monorepo. OG image dans `public/og.png` (méta OG absolues sur `https://tamdoku.fr`). **À faire avant/juste après le 1er deploy** : créer le site dans Umami et injecter le script `u.js` dans `index.html` (cf. mémoire `umami-website-ids`).

## À venir

Score d'originalité **réel** (stats joueurs par case/jour, backend à décider — Supabase probable ; aujourd'hui cold-start via `engine/fame.ts`), archive (rejouer les grilles passées via `engine/generator.ts`), mode entraînement (déjà dans `useGame`/`daily.ts`, pas encore surfacé dans l'UI — fidélité à la maquette).
