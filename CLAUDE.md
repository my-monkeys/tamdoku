# CLAUDE.md — tamdoku

Puzzle quotidien du tram de Montpellier (clone d'ubahndoku.de). **App jouable de bout en bout** (données + moteur + UI). Lire `docs/superpowers/specs/2026-07-04-tamdoku-design.md` avant de toucher au moteur.

## Stack & couches

- **`engine/`** — lib TypeScript pure, **browser-safe** (aucun accès réseau/fs sauf `network.ts`, réservé à Node/CLI ; l'app importe `data/network.json` directement et ne touche jamais `network.ts`). Zéro dépendance runtime.
- **`src/`** — app **Vite + React + TS**, mobile-first, portée de la maquette Claude Design (`design/Tamdoku.dc.html`). CSS repris **verbatim** dans `src/styles.css`. Logique du jeu dans `src/useGame.ts` (port de la classe `DCLogic`), câblée à l'engine.
- **`pipeline/` / `cli/`** — Node (tsx).

### Câblage app ↔ engine (décision clé)

La maquette embarquait son propre prototype de données (~53 stations, quelques erreurs) et son générateur, et n'exposait que **9 critères à but démonstratif**. L'app **remplace ça par le vrai engine** : `data/network.json` (110 stations OSM/GTFS), `engine/daily.ts` (grille du jour déterministe), `engine/criteria.ts` (métadonnées d'affichage — icône/libellé/explication **sans exemple de station** — pour **les 43 règles** du catalogue, plus juste les 9), `engine/fame.ts` (notoriété → score d'originalité + tri des suggestions), `engine/answer.ts` (résolution de saisie). On garde le rendu de la maquette mais des données exactes et tout le catalogue.

- Le générateur du jour tire parmi **tout le catalogue** avec équilibrage des familles (`drawRuleSet` partagé depuis `generator.ts` : ≥ 1 ligne, ≤ 2 par sous-famille, ≤ 2 règles-lettres), sinon les grilles seraient noyées sous les « contient un X ».
- Deux générateurs coexistent : `engine/daily.ts` (date-seedé, indépendant, O(1) au chargement — **utilisé par l'app**) et `engine/generator.ts` (série anti-répétition — pour une future archive + le CLI `gen`). Ne pas confondre.
- **Toute nouvelle règle dans `rules.ts` doit recevoir ses métadonnées dans `criteria.ts`** (sinon `buildCriteria` throw). Les lettres et communes sont générées automatiquement, le reste via la table `META`. Explications **sans nom de station** (règle absolue).
- Deux tsconfig : racine (Node, `engine/pipeline/cli/test/*.ts`) + `tsconfig.app.json` (DOM+JSX, `src` + `test/**/*.tsx`). `npm run typecheck` lance les deux.

## Invariants à ne pas casser

- **La grille du jour est déterministe par date** (`engine/daily.ts` + `seedForDate`) : même date → même grille pour tout le monde, calculée côté client. Ne pas changer la façon de dériver la graine après le lancement, sinon les grilles passées changent. (`engine/generator.ts` garde en plus un `EPOCH = "2026-07-06"` figé pour la future série d'archive.)
- La desserte vient d'**OSM (réseau nominal)**, jamais de l'union des trips GTFS : le GTFS contient les déviations travaux (été 2026 : L1 via Peyrou, L2 via Les Aubes, L4 via Antigone). Le GTFS ne sert qu'à l'identité/alias/couleurs.
- Stations distinctes comme sur le plan officiel (les deux Gare Saint-Roch, les deux Albert 1er, les deux Saint-Éloi) ; seuls les quais directionnels fusionnent (Gambetta ×3 → 1), via `pipeline/curation.json`.
- **Garcia Lorca est le terminus de la L4** : la ligne est circulaire (`circular: true`) *et* a un terminus (l'origine de la boucle). Ne pas re-sauter la L4 dans le calcul des terminus.
- Toute règle du catalogue doit couvrir 6–88 stations (12–66 pour les lettres) — garde automatique dans `buildRules`.
- **Changer la définition d'une règle réécrit l'archive** (le tirage de `generateDaily` dépend des `stationIds` via faisabilité/qualité, même pour des grilles qui n'affichent pas la règle). Précédent assumé : la correction « lettre doublée par mot » (juillet 2026, v0.3.17) a réécrit 4 grilles passées, annoncée par une modale one-shot in-app (`RuleFixNotice`). Pour une future correction, décider explicitement avec Maxim : réécrire + annoncer, ou versionner par date (une bascule datée `poolFor(date)` avait été implémentée en v0.3.14 puis retirée en v0.3.17 — voir l'historique git si besoin du pattern).

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
- **Thème clair uniquement** (choix de Maxim) : le sombre de la maquette a été retiré (CSS `.app.dark`/`body.dark-page` supprimé, `data-theme=light` figé). Ne pas réintroduire le suivi `prefers-color-scheme`.
- Le partage produit une **carte PNG canvas** (`src/shareCard.ts`, 1080×1350) : elle est **pré-rendue dès l'écran de résultat** (ref dans `App.tsx`) car `navigator.share` exige un geste utilisateur encore « frais » — ne pas déplacer le rendu dans le handler du bouton. Les emojis (`emojiGrid`) ne servent plus qu'au texte de fallback (copie presse-papier).
- Vérif sans navigateur : `test/app.integration.test.tsx` (jsdom) monte l'app et joue une grille complète jusqu'à la victoire — c'est le filet de sécurité du portage. **Encore à faire : une passe visuelle en vrai navigateur** (l'extension Chrome n'était pas connectée au moment du build).

## Déploiement

Vite SPA : `npm run build` → `dist/` → `.monkey` (`source: ./dist/`, target **`tamdoku.fr`** — domaine dédié, pas un sous-domaine `my-monkey.fr` ; O2switch doit avoir le vhost `tamdoku.fr`). Confirmer le deploy via l'API admin monkey (`status: success`), cf. CLAUDE.md monorepo. OG image dans `public/og.png` (méta OG absolues sur `https://tamdoku.fr`). **À faire avant/juste après le 1er deploy** : créer le site dans Umami et injecter le script `u.js` dans `index.html` (cf. mémoire `umami-website-ids`).

**PWA** (v0.3.16) : `vite-plugin-pwa` en `generateSW`/`autoUpdate` — shell précaché (~365 Ko, `og.png` et grosses icônes exclues), fonts Google en CacheFirst, manifest statique de `public/` conservé (`manifest: false`). Le jeu est 100 % jouable hors-ligne (grille calculée côté client par date). ⚠️ `tamdoku.fr` est derrière **Cloudflare** qui cache `sw.js` en edge ~4 h (`max-age=14400`, TTL défaut des `.js` — la directive no-cache du `.htaccess` ne passe pas) : après un deploy, les PWA installées peuvent mettre jusqu'à ~4 h à récupérer le nouveau SW. Si ça devient gênant, créer une Cache Rule Cloudflare « Bypass cache » sur `/sw.js`.

## À venir

Score d'originalité **réel** (stats joueurs par case/jour, backend à décider — Supabase probable ; aujourd'hui cold-start via `engine/fame.ts`), archive (rejouer les grilles passées via `engine/generator.ts`), mode entraînement (déjà dans `useGame`/`daily.ts`, pas encore surfacé dans l'UI — fidélité à la maquette).
