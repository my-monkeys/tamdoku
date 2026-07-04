# Tamdoku

Le puzzle quotidien du tramway de Montpellier — un sudoku de stations, sur le modèle d'[ubahndoku.de](https://ubahndoku.de/). Grille 3×3 : chaque ligne et colonne porte un critère (« Sur la ligne 2 », « Porte le nom d'une personnalité », « Contient un B »…), chaque case se remplit avec une station TaM qui satisfait les deux.

Ce repo contient les **données et le moteur** (l'UI arrive ensuite) :

- `pipeline/` — construit `data/network.json` : 110 stations, 5 lignes, depuis OSM (desserte nominale) + GTFS TaM (identité officielle) + geo.api.gouv.fr (communes), avec curation manuelle (`pipeline/curation.json`).
- `engine/` — lib TypeScript pure : catalogue de ~40 règles, générateur de grilles quotidiennes déterministe (même date → même grille), matching biparti garantissant la solvabilité, correspondance de saisie avec alias.
- `cli/` — prévisualisation terminal.

## Commandes

```bash
npm run build:data          # re-fetch OSM + GTFS + communes, reconstruit network.json
npm run stats               # couverture des règles + compatibilité des paires
npm run gen                 # grille du jour
npm run gen -- --date 2026-07-10
npm run gen -- --days 30    # récap des 30 premières grilles
npm test                    # 36 tests (données, règles, générateur sur 365 jours)
npm run typecheck
```

## Voir aussi

- Design et décisions : `docs/superpowers/specs/2026-07-04-tamdoku-design.md`
- Conventions du projet : `CLAUDE.md`
