# Design source

`Tamdoku.dc.html` est la maquette d'origine, exportée du projet **Claude Design**
« Tamdoku Montpellier » (format Design Component : template `<x-dc>` + logique
`DCLogic`, rendu par un runtime maison). C'est la **référence visuelle** de l'app.

L'implémentation `src/` porte fidèlement ses styles (repris verbatim dans
`src/styles.css`), ses écrans et ses interactions, mais remplace le prototype de
données/génération embarqué par le vrai engine :

| Maquette (prototype) | App (`src/`) |
|---|---|
| ~53 stations codées en dur, quelques erreurs (L1 « Odysseum », station inexistante, Gare Saint-Roch fusionnée) | `data/network.json` réel (110 stations OSM/GTFS, pôles distincts) |
| `genPuzzle` / `validFor` / `hasSDR` inline | `engine/daily.ts` + `engine/matching.ts` |
| 9 critères codés en dur | mêmes 9 critères, mappés aux vraies règles (`engine/criteria.ts`) |
| poids de notoriété `f` à la main | `engine/fame.ts` (heuristique déterministe) |

Ne pas éditer ce fichier pour faire évoluer l'app — modifier `src/`. Il n'est
gardé que pour comparer le rendu.
