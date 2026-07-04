# Tamdoku

Le puzzle quotidien du tramway de Montpellier — un sudoku de stations, sur le modèle d'[ubahndoku.de](https://ubahndoku.de/). Grille 3×3 : chaque ligne et colonne porte un critère (« Sur la ligne 2 », « Nom propre », « Terminus »…), chaque case se remplit avec une station TaM qui satisfait les deux, sans jamais réutiliser une station. 3 erreurs max, score d'originalité, série quotidienne.

## Structure

- **`src/`** — l'app (Vite + React + TypeScript, mobile-first), portée depuis la maquette Claude Design (`design/Tamdoku.dc.html`), câblée à l'engine.
- **`engine/`** — lib TypeScript pure (aucune dépendance runtime, browser-safe) : catalogue de règles, générateur quotidien déterministe, matching biparti, notoriété, résolution de saisie.
- **`pipeline/`** — construit `data/network.json` (110 stations, 5 lignes) depuis OSM (desserte nominale) + GTFS TaM (identité officielle) + geo.api.gouv.fr (communes), avec curation manuelle.
- **`cli/`** — prévisualisation terminal des grilles et stats.
- **`design/`** — la maquette source (référence visuelle).

## Commandes

```bash
npm run dev                 # serveur de dev Vite
npm run build               # build de prod → dist/
npm run preview             # sert le build

npm run build:data          # re-fetch OSM + GTFS + communes, reconstruit network.json
npm run gen                 # grille du jour en terminal (--days 30, --date 2026-07-10)
npm run stats               # couverture des règles

npm test                    # 46 tests (données, règles, générateur, notoriété, app end-to-end jsdom)
npm run typecheck           # engine (Node) + app (DOM)
```

## Comment ça marche

L'app calcule la grille du jour **côté client**, de façon déterministe à partir de
la date (même grille pour tout le monde, sans backend) : `engine/daily.ts` tire la
meilleure grille parmi N essais sur les 9 critères évocateurs (`engine/criteria.ts`),
sur les vraies données du réseau. Le score d'originalité (cold-start) et le tri des
suggestions s'appuient sur une notoriété déterministe des stations (`engine/fame.ts`).
Progression, série et stats sont stockées en `localStorage`.

## Déploiement

Vite SPA → `dist/` → `tamdoku.my-monkey.fr` via le système `.monkey` (cf. CLAUDE.md monorepo).

## Voir aussi

- Design et décisions : `docs/superpowers/specs/2026-07-04-tamdoku-design.md`
- Conventions du projet : `CLAUDE.md`
