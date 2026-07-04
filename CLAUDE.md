# CLAUDE.md — tamdoku

Puzzle quotidien du tram de Montpellier (clone d'ubahndoku.de). **Phase actuelle : données + moteur uniquement** — l'UI sera faite sur design fourni par Maxim. Lire `docs/superpowers/specs/2026-07-04-tamdoku-design.md` avant de toucher au moteur.

## Stack

TypeScript strict + tsx + vitest, **zéro dépendance runtime**. `engine/` est une lib pure (aucun accès réseau/fs sauf `network.ts` qui charge `data/network.json`) — elle doit rester importable telle quelle par la future UI.

## Invariants à ne pas casser

- **`EPOCH = "2026-07-06"` dans `engine/generator.ts` ne doit JAMAIS changer après le lancement** : toute la série de grilles en découle (grille du jour N = rejeu déterministe depuis l'epoch).
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

## À venir (avec l'UI)

Score d'originalité (stats joueurs par case/jour, backend à décider — Supabase probable), archive, série/streak, partage emoji. Le moteur expose déjà : grilles + solutions + difficulté (`generator.ts`), autocomplete + validation de saisie (`answer.ts`).
