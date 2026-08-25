# CLAUDE.md — tamdoku

Puzzle quotidien du tram de Montpellier (clone d'ubahndoku.de). **App jouable de bout en bout** (données + moteur + UI). Lire `docs/superpowers/specs/2026-07-04-tamdoku-design.md` avant de toucher au moteur.

## Stack & couches

- **`engine/`** — lib TypeScript pure, **browser-safe** (aucun accès réseau/fs sauf `network.ts`, réservé à Node/CLI ; l'app importe `data/network.json` directement et ne touche jamais `network.ts`). Zéro dépendance runtime.
- **`src/`** — app **Vite + React + TS**, mobile-first, portée de la maquette Claude Design (`design/Tamdoku.dc.html`). CSS repris **verbatim** dans `src/styles.css`. Logique du jeu dans `src/useGame.ts` (port de la classe `DCLogic`), câblée à l'engine.
- **`pipeline/` / `cli/`** — Node (tsx).

### Câblage app ↔ engine (décision clé)

La maquette embarquait son propre prototype de données (~53 stations, quelques erreurs) et son générateur, et n'exposait que **9 critères à but démonstratif**. L'app **remplace ça par le vrai engine** : `data/network.json` (116 stations OSM/GTFS), `engine/daily.ts` (grille du jour déterministe), `engine/criteria.ts` (métadonnées d'affichage — icône/libellé/explication **sans exemple de station** — pour **les 45 règles** du catalogue, plus juste les 9), `engine/fame.ts` (notoriété → score d'originalité + tri des suggestions), `engine/answer.ts` (résolution de saisie). On garde le rendu de la maquette mais des données exactes et tout le catalogue.

- Le générateur du jour tire parmi **tout le catalogue** avec équilibrage des familles (`drawRuleSet` partagé depuis `generator.ts` : ≥ 1 ligne, ≤ 2 par sous-famille, ≤ 2 règles-lettres), sinon les grilles seraient noyées sous les « contient un X ».
- Deux générateurs coexistent : `engine/daily.ts` (date-seedé, indépendant, O(1) au chargement — **utilisé par l'app**) et `engine/generator.ts` (série anti-répétition — pour une future archive + le CLI `gen`). Ne pas confondre.
- **Toute nouvelle règle dans `rules.ts` doit recevoir ses métadonnées dans `criteria.ts`** (sinon `buildCriteria` throw). Les lettres et communes sont générées automatiquement, le reste via la table `META`. Explications **sans nom de station** (règle absolue).
- Deux tsconfig : racine (Node, `engine/pipeline/cli/test/*.ts`) + `tsconfig.app.json` (DOM+JSX, `src` + `test/**/*.tsx`). `pnpm run typecheck` lance les deux.

## Invariants à ne pas casser

- **La grille du jour est déterministe par date** (`engine/daily.ts` + `seedForDate`) : même date → même grille pour tout le monde, calculée côté client. Ne pas changer la façon de dériver la graine après le lancement, sinon les grilles passées changent. (`engine/generator.ts` garde en plus un `EPOCH = "2026-07-06"` figé pour la future série d'archive.)
- La desserte vient d'**OSM (réseau nominal)**, jamais de l'union des trips GTFS : le GTFS contient les déviations travaux (été 2026 : L1 via Peyrou, L2 via Les Aubes, L4 via Antigone). Le GTFS ne sert qu'à l'identité/alias/couleurs.
- Stations distinctes comme sur le plan officiel (les deux Gare Saint-Roch, les deux Albert 1er, les deux Saint-Éloi) ; seuls les quais directionnels fusionnent (Gambetta ×3 → 1), via `pipeline/curation.json`.
- **Le réseau lui-même est daté** (v0.3.32, arrivée du Bustram A) : `Line.since` + `networkFor(net, date)` (`engine/select.ts`) retirent une ligne pas encore ouverte **et les stations qu'elle est seule à desservir**. Le catalogue est donc recompilé sur le réseau de la date — `catalogFor(date)` dans `src/data.ts`, mémoïsé par état du réseau, pas par jour. C'est ce double filtrage (réseau puis règles) qui fige les grilles passées : ajouter 6 stations sans lui réécrivait **les 51 grilles** de l'archive, mesuré. Un test le verrouille (`test/daily.test.ts`, valeurs figées de v0.3.25).
  Corollaire : tout ce qui touche au périmètre passe par la date de la grille — saisie et suggestions (`networkDateOf(g)` dans `useGame`), plan-indice (`mapGeoFor`), diagramme des lignes, légendes (`LineLegend`), liste des critères. `criteria`/`rule()`/`satisfies()` restent sur le catalogue complet : ce sont des dictionnaires, on n'y accède que par des ids déjà tirés.
- **Le Bustram A compte comme une ligne à part entière** (décision de Maxim, 2026-08-25) : correspondances et terminus le voient — Notre-Dame de Sablassou cesse d'être « une seule ligne », Place de l'Europe devient terminus. Il n'a que **8 stations** : seul, il ne peut pas remplir 9 cases, donc l'entraînement sur la seule pastille A est bloqué (`MIN_PRACTICE_STATIONS`, + un `try/catch` dans `startPractice`). Toutes les autres combinaisons de lignes passent.
- **Garcia Lorca est le terminus de la L4** : la ligne est circulaire (`circular: true`) *et* a un terminus (l'origine de la boucle). Ne pas re-sauter la L4 dans le calcul des terminus.
- Toute règle du catalogue doit couvrir au moins 6 stations (12 pour les lettres) et au plus **80 % du réseau** (60 % pour les lettres) — garde automatique dans `buildRules`. Le plafond est **proportionnel depuis v0.3.32**, et ce n'est pas cosmétique : figé à 88, l'arrivée du Bustram faisait sortir « Dans Montpellier » (85 → 90) et « Contient un N » (65 → 70) du catalogue. À 110 stations les deux formes donnent exactement 88 et 66, donc le catalogue d'avant est inchangé — condition pour ne pas réécrire l'archive.
- **Changer la définition d'une règle réécrit l'archive** (le tirage de `generateDaily` dépend des `stationIds` via faisabilité/qualité, même pour des grilles qui n'affichent pas la règle). Précédent assumé : la correction « lettre doublée par mot » (juillet 2026, v0.3.17) a réécrit 4 grilles passées, annoncée par une modale one-shot in-app (`NewsNotice`, ex-`RuleFixNotice` — un seul composant d'annonce, à recycler par salve : clé `lsGet` versionnée + date de fin). Pour une future correction, décider explicitement avec Maxim : réécrire + annoncer, ou versionner par date. Le pattern datation est en place depuis v0.3.26 pour les **introductions** de règles : champ `since` sur la règle + `poolFor(rules, date)` (`engine/rules.ts`) — utilisé pour « P+Tram » au 2026-08-02, avec une marge d'un jour entre release et bascule pour laisser les PWA se mettre à jour (sinon un client pas à jour génère une grille différente le jour J).

## Rafraîchir les données

```bash
pnpm run build:data   # OSM (tram + Bustram) + GTFS + communes → data/network.json
pnpm test             # les invariants réseau + 365 jours de grilles revalidés
```

⚠️ **Étendre le réseau, c'est deux sources à toucher, pas une.** OSM range les Bustram en
`route=bus` — seul leur **nom** les distingue (`fetch-osm.ts` filtre sur `[Bb]ustram`, snapshot
séparé `osm-bustram.json`) ; le GTFS, lui, les met en `route_type=3` comme n'importe quel bus et
ne donne aucun indice : `fetch-gtfs.ts` les **nomme** (`BUSTRAM_REFS`). `fetch-communes.ts` lit
les deux snapshots et **réutilise les communes déjà résolues** — une commune ne bouge pas, et
re-interroger l'API entière pour six arrêts fragilise un build reproductible.

⚠️ **Ne pas re-fetcher les snapshots existants pour ajouter une ligne.** Un OSM/GTFS plus récent
peut déplacer autre chose et réécrire l'archive malgré la datation. Le zip GTFS local suffisait
pour la ligne A (`fetch-gtfs.ts` ne télécharge que si le zip manque). Après un `build:network`,
**differ `data/network.json`** : pour le Bustram, le diff attendu était exactement 6 stations,
+`A` sur les deux stations partagées, la ligne, et la couleur de la L5 (vide côté GTFS, reprise
d'OSM). ⚠️ Au passage, les coordonnées d'une station partagée **bougent** (moyenne des quais,
arrêts bus compris) : vérifier que ça ne fait basculer aucune règle géographique — pour A, aucune.

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
- Vérif sans navigateur : `test/app.integration.test.tsx` (jsdom) monte l'app et joue une grille complète jusqu'à la victoire — c'est le filet de sécurité du portage. Pour la passe visuelle, l'extension Claude in Chrome n'a jamais répondu ici : **passer par le MCP Playwright** sur `pnpm run preview`.
- ⚠️ **En preview locale, le service worker sert l'ancien build.** Après un `pnpm run build`, la page peut afficher la version précédente — précachée. Recharger avec une URL différente (`?v=2`) pour voir le nouveau bundle, sinon on croit à tort qu'un changement n'est pas passé.
- Le plan-indice porte une **légende des lignes** (`.hintmap-legend`, demande de Maxim) et la palette de l'app vit dans `src/lineColors.ts` — partagée par le plan, le diagramme des lignes et les légendes. `network.json` garde la couleur GTFS, qui n'est pas toujours renseignée : ne pas s'en servir pour l'affichage.
- ⚠️ **`gsap.registerPlugin(useGSAP)` est ce qui rend le nettoyage possible**, pas une formalité : sans lui, `useGSAP` ne révoque plus ses tweens au démontage — cinq survivent par montage, dont l'animation d'accueil en `repeat: -1` qui garde le ticker éveillé. Il vit donc dans `src/App.tsx`, avec le code qui l'utilise, et **non dans `main.tsx`** que les tests ne chargent pas (c'était la cause du fichier d'intégration qui partait en timeout au fil de ses tests).

## Déploiement

Vite SPA servie par **Coolify sur prod-cookie** : un `git push` sur `main` suffit, il n'y a plus de tarball ni de `.monkey` à jouer (le fichier reste, mais seul son bloc `site` sert encore, au registre `git.my-monkey.fr`). L'application est `rxlj6txgh2tnmvvavy8yotog`, en `nixpacks` + `is_static`, sur le domaine dédié **`tamdoku.fr`** (zone Cloudflare en mode **Full** → déclarée en `https://`). Suivre et vérifier le déploiement : cf. « Vérifier une mise en prod » dans le CLAUDE.md du monorepo — un 200 ne suffit pas, ouvrir une page qui exerce le jeu.

⚠️ **Ne jamais committer `dist/`** : nixpacks finit par un `COPY . /app`, un dossier de build versionné écraserait silencieusement celui que le build vient de produire.

Convention de release : version bumpée dans `package.json`, message de commit terminé par « — release vX.Y.Z », et **tag `vX.Y.Z` sur ce commit** (`v0.3.29` a échappé au tag, les autres l'ont). OG image dans `public/og.png` (méta OG absolues sur `https://tamdoku.fr`).

**PWA** (v0.3.16) : `vite-plugin-pwa` en `generateSW`/`autoUpdate` — shell précaché (~365 Ko, `og.png` et grosses icônes exclues), fonts Google en CacheFirst, manifest statique de `public/` conservé (`manifest: false`). Le jeu est 100 % jouable hors-ligne (grille calculée côté client par date). ⚠️ `tamdoku.fr` est derrière **Cloudflare** qui cache `sw.js` en edge ~4 h (`max-age=14400`, TTL défaut des `.js` — la directive no-cache du `.htaccess` ne passe pas) : après un deploy, les PWA installées peuvent mettre jusqu'à ~4 h à récupérer le nouveau SW. Si ça devient gênant, créer une Cache Rule Cloudflare « Bypass cache » sur `/sw.js`.

## À venir

Fait depuis : score d'originalité réel (backend Convex `t-api.my-monkey.fr`, `src/stats.ts`, fallback `engine/fame.ts`), archive rejouable par date (v0.3.25 — rejeu d'une grille finie avec meilleur résultat conservé, via `daily.ts` ; `engine/generator.ts` reste réservé à une éventuelle série anti-répétition).

**Mode entraînement** livré en v0.3.30 : carte d'accueil (`src/components/PracticeCard.tsx`) à pastilles L1→L5, `startPractice(lines)` dans `useGame`, `poolForLines()` dans `src/data.ts` et `restrictRules()` dans `engine/rules.ts`. Le périmètre est étanche (suggestions, saisie et solutions), rien n'est sauvegardé ni remonté aux stats. Sur **une** ligne, le critère « Sur la ligne N » sort du tirage (vrai partout) via l'option `lineRules` de `generateDaily` — **absente du chemin quotidien, pour que la graine du défi soit consommée à l'identique** ; à partir de deux lignes il redevient discriminant, correspondances comprises.

**Bustram A livré en v0.3.32**, bascule au **2026-08-27** (idée d'un joueur, retour du 23/08 — conducteur TER en Occitanie, qui s'est aussi proposé pour un projet autour des lignes TER). Six stations de plus, une sixième pastille partout (accueil, entraînement, plan-indice + sa nouvelle légende, diagramme des lignes), et la **datation du réseau** qui va avec (cf. invariants).

Reste : classement entre joueurs (les réponses par case/jour existent déjà côté serveur), règles candidates issues des retours joueurs — Est/Ouest du Lez, FISE (P+Tram livrée en v0.3.26, bascule 02/08). Nouvelle règle ou nouvelle ligne = champ `since` + annonce (cf. invariants) : décision explicite avec Maxim à chaque fois.
