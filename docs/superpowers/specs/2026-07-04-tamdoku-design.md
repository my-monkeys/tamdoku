# Tamdoku — design (données + moteur)

**Date** : 2026-07-04 · **Périmètre** : pipeline de données, catalogue de règles, générateur de grilles. L'interface viendra ensuite (design fourni par Maxim).

## Le jeu

Clone d'[ubahndoku.de](https://ubahndoku.de/) pour le tramway de Montpellier (TaM) :

- Grille **3×3 quotidienne**, identique pour tout le monde. Chaque ligne et chaque colonne porte un **critère** ; chaque case se remplit avec une station qui satisfait les deux critères.
- **3 erreurs max**, une station placée est figée et **non réutilisable** dans la grille.
- Seules les **lignes directes** comptent (la ligne s'arrête physiquement à la station, pas de correspondance).
- Mode **normal** (nombre de réponses possibles + autocomplete) / mode **expert** (saisie de mémoire).
- Score d'**originalité 0–900** : plus la réponse est rare parmi les joueurs du jour, plus elle rapporte ; bonus fixe par bonne réponse ; −20 pts par erreur. *(Sera implémenté avec l'UI/backend — nécessite les stats joueurs ; cold-start prévu sur une heuristique de notoriété de station.)*
- **Archive** rejouable, hors série quotidienne. Nouveau puzzle à minuit (Europe/Paris).

Périmètre v1 : **tramway uniquement** (lignes 1–5), pas les bus.

## Sources de données — décisions

| Donnée | Source | Pourquoi |
|---|---|---|
| Desserte nominale, topologie | **OSM (Overpass)**, relations `route=tram` | À jour du réseau réel (extension L1 → Gare Sud de France, L5 complète) et représente le **réseau nominal**, pas les déviations |
| Identité des stations, alias, couleurs | **GTFS TaM** (open data 3M) | Nomenclature officielle de l'exploitant |
| Communes | **geo.api.gouv.fr** (point → commune) | Objectif et sans ambiguïté |
| P+Tram | OSM `park_ride=yes` à ≤ 300 m | Données terrain, overridable en curation |

**Pourquoi pas le GTFS pour la desserte ?** Le GTFS de juin 2026 contient les **déviations du chantier d'été** (L1 via Peyrou 78 jours de service contre 41 via Comédie, L2 via Les Aubes, L4 via Antigone). L'union naïve des trips donnerait des dessertes fausses (« Antigone est sur la L4 »). Le jeu reflète le **plan officiel permanent** : les réponses ne changent pas avec les travaux. Le build affiche un rapport de croisement OSM↔GTFS (seuil 10 % des courses) pour vérifier chaque divergence à chaque rafraîchissement des données.

**Identité des stations.** On suit la carte officielle : les pôles proches restent des stations **distinctes** (« Gare Saint-Roch » {1,2} ≠ « Gare Saint-Roch - République » {3,4} ; « Albert 1er - Saint-Charles » {1,5} ≠ « Albert 1er - Jardin des Plantes » {4,5}). En revanche les **quais directionnels** que le GTFS considère comme une seule station sont fusionnés (« Gambetta - Chaptal » et « Gambetta - Saint-Denis » → « Gambetta » {3,5}) via `pipeline/curation.json`.

**Alias de saisie.** Chaque station accepte : nom canonique, nom GTFS, quais directionnels fusionnés, et un **alias court automatique** (préfixe avant « - »/« ( » : « Louis Blanc », « Occitanie », « Peyrou ») uniquement quand il est non ambigu — « Albert 1er », « Gare Saint-Roch », « Pérols », « Rives du Lez » sont refusés.

Résultat : **110 stations, 5 lignes** dans `data/network.json` (committé, reproductible depuis les snapshots `data/raw/`).

## Catalogue de règles (~40)

Familles (inspirées de la grille réelle d'ubahndoku : arrondissement, ligne, « Name enthält Straße », double lettre, nom long, contient M) :

1. **ligne** (5) : « Sur la ligne N ».
2. **reseau** : correspondance (≥ 2 lignes), terminus, P+Tram.
3. **nom** : lettres dynamiques (chaque lettre dont la couverture tombe entre 12 et 66 stations), commence/finit par une voyelle, contient « Saint », accent, apostrophe, lettre doublée, chiffre, nom long ≥ 18 lettres / court ≤ 8, un seul mot / ≥ 3 mots.
4. **semantique** (tags curés dans `curation.json`) : personnalité, espace vert, sport, enseignement/recherche.
5. **geo** : dans/hors Montpellier, communes ≥ 6 stations (Castelnau-le-Lez), nord/sud/est/ouest de la Comédie, < 1,5 km / > 5 km de la Comédie.

Garde de jouabilité : une règle n'entre au catalogue que si elle couvre **6 à 88 stations** (12–66 pour les lettres). Le catalogue est **dynamique** : reconstruit depuis `network.json`, il s'adapte si le réseau évolue (une extension de ligne peut faire apparaître/disparaître une règle-lettre).

## Générateur quotidien

- **Déterministe** : RNG seedé `hash("tamdoku:" + EPOCH + ":" + jour)` ; la série se rejoue depuis `EPOCH = 2026-07-06` (⚠ ne jamais changer après lancement). Même date → même grille pour tous, sans backend.
- **Validité** : chaque case ≥ 2 solutions ; **matching biparti parfait** (il existe une affectation de 9 stations toutes distinctes — la contrainte de non-réutilisation est donc toujours satisfiable).
- **Qualité** : ≥ 1 règle ligne par grille (1 : 45 %, 2 : 40 %, 3 : 15 %) ; ≤ 2 règles par sous-famille ; ≤ 2 règles-lettres ; au moins une case « pimentée » (≤ 8 solutions) ; moyenne ≤ 40 solutions/case.
- **Anti-répétition** : cooldown 3 jours par règle (2 jours pour les règles ligne, ressource rare : 5 règles, ≥ 1 exigée par jour) ; une même combinaison de 6 règles ne ressort jamais. Vérifié par test sur 365 jours simulés — le mode dégradé (relâchement du cooldown après 300 tentatives) ne se déclenche jamais.
- **Difficulté** : Σ 1/|solutions par case| (≈ 0,5 facile → 2,6 dur), stockée dans la grille pour l'UI et l'équilibrage.

Performance : 365 grilles générées et validées en ~100 ms — l'UI pourra recalculer la série au build ou à la volée.

## Structure

```
tamdoku/
  pipeline/   fetch-osm, fetch-gtfs, fetch-communes, build-network, curation.json
  engine/     types, text, rng, matching, rules, generator, answer, network
  cli/        stats (couverture des règles), gen (preview grilles)
  data/       network.json (committé) + raw/ (snapshots committés, sauf zip GTFS)
  test/       36 tests vitest
```

Aucune dépendance runtime ; le moteur est une lib TS pure importable telle quelle par la future UI.

## Hors périmètre v1 (notes pour la suite)

- **Score d'originalité réel** : nécessite un backend de stats par case/jour (Supabase probable, comme les autres projets). Cold-start sur heuristique de notoriété.
- **UI** : design fourni par Maxim ; le moteur expose grille + solutions + suggestions + matching de saisie.
- **Rafraîchissement des données** : relancer `npm run build:data` (ex. cron mensuel) puis vérifier le rapport de croisement ; l'ouverture de la L5 ouest (Lavérune centre) ou du prolongement L1 changera le réseau — les règles et grilles suivront automatiquement.
- Règles écartées faute d'effectif : sport (5 stations), gare SNCF (3), « une seule ligne » (90, trop large), quartiers de Montpellier (nécessite les polygones officiels — piste intéressante pour enrichir la famille geo).
