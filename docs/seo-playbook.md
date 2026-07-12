# SEO playbook — tamdoku.fr

> État au 2026-07-12. Le on-page est bon ; le domaine est **jeune et sans autorité**.
> Le vrai levier maintenant est **off-page** (indexation pilotée + backlinks + presse).

## 1. Réalité des mots-clés (à quoi renoncer, quoi viser)

| Requête | Verdict | Pourquoi |
|---|---|---|
| `TAM Montpellier`, `Montpellier tramway`, `tram de Montpellier`, `horaires tram Montpellier` | ❌ **Ne pas viser** | Intention **transactionnelle** (horaires/plan/tarifs). Trustées par tam-voyages.com, Wikipédia, tramwaydemontpellier.net. Celui qui tape ça ne veut pas un jeu. Un domaine d'une semaine n'y montera jamais et ça ne convertirait pas. |
| `jeu tram Montpellier`, `jeu tramway Montpellier`, `sudoku tram Montpellier`, `sudoku stations Montpellier`, `wordle Montpellier`, `jeu stations tram Montpellier`, `puzzle tram Montpellier` | ✅ **Cible** | Intention **jeu**. On y est déjà #1–2. C'est là que sont les vrais joueurs. |
| `tamdoku` (marque) | ✅ Déjà #1 | À protéger. |

**Conclusion** : on ne se bat PAS sur les têtes de requêtes institutionnelles. On consolide le long-tail « jeu » et on gagne de l'autorité pour remonter en France (aujourd'hui Reddit passe devant faute de backlinks).

## 2. Google Search Console — À FAIRE EN PREMIER (30 min, gratuit)

C'est l'action n°1. Sans ça on pilote à l'aveugle (mes recherches sont proxy-US, la vraie donnée FR est dans GSC).

1. https://search.google.com/search-console → **Ajouter une propriété** → type **Domaine** → `tamdoku.fr`.
2. Vérification par **enregistrement DNS TXT** (le domaine est chez O2switch / derrière Cloudflare — ajouter le TXT dans la zone DNS Cloudflare).
3. **Sitemaps** → soumettre `https://tamdoku.fr/sitemap.xml` (il liste maintenant `/`, `/regles`, `/a-propos`, `/archive`).
4. **Inspection de l'URL** → coller `https://tamdoku.fr/` → **Demander une indexation**. Refaire pour `/regles` et `/a-propos` (les nouvelles pages).
5. Revenir dans **1–2 semaines** sur l'onglet **Performances** : ce sont les VRAIES requêtes + positions FR. On optimise les titres en fonction de ce que les gens tapent réellement.

> ⚠️ Après le déploiement des changements de ce commit, refaire l'étape 4 (« Demander une indexation ») pour que Google recrawle le nouveau contenu.

## 3. Bing Webmaster Tools (10 min) — bonus qui compte

Bing alimente aussi **ChatGPT Search** et **Copilot**. https://www.bing.com/webmasters → import direct depuis GSC en 1 clic → soumettre le sitemap. IndexNow est déjà à portée si on veut du push instantané plus tard.

## 4. Backlinks — le vrai moteur (par ordre de ROI)

**Leçon-clé : metrodoku a percé grâce à la PRESSE** (article laviedurail.com). Un seul bon pickup presse local vaut plus que 50 tweaks meta.

### 4.1 Presse locale Montpellier (priorité haute)
Angle à vendre : *« Un Montpelliérain crée le “Wordle du tram” : un puzzle quotidien gratuit avec les vraies stations TaM. »* (angle humain + local + gratuit + malin = pickup facile pour un desk local en manque de sujets légers).

Cibles (vérifier l'email/formulaire actuel avant envoi) :
- **Midi Libre** (rubrique Montpellier) — le plus gros levier local
- **actu.fr** / **Métropolitain** (metropolitain.fr) — desks Montpellier réactifs sur le sujet « insolite/numérique »
- **France 3 Occitanie** (web) / **France Bleu Hérault**
- **20 Minutes Montpellier**
- **Made in Montpellier**, **ToutMontpellier**, **Montpellier Infos** (blogs/médias locaux, backlinks faciles)

**Template email (copier-coller, adapter l'expéditeur) :**

> **Objet : Le “Wordle du tram de Montpellier”, créé par un collectif local**
>
> Bonjour,
>
> Je me permets de vous signaler un petit jeu qui pourrait plaire à vos lecteurs montpelliérains : **Tamdoku** (https://tamdoku.fr), un puzzle quotidien gratuit dans l'esprit du Wordle, mais avec les **vraies stations du tram TaM**. Chaque jour une grille 3×3 : il faut y placer les stations qui correspondent aux critères de chaque ligne et colonne (une ligne de tram, un terminus, une correspondance, une commune…).
>
> C'est gratuit, sans pub ni compte, jouable en 2 minutes, et construit sur les données ouvertes du réseau. Une grille par jour, la même pour tout le monde — comme le Wordle.
>
> C'est un projet indépendant du collectif montpelliérain **My-Monkey**. Je reste dispo pour tout complément (visuels, interview, chiffres).
>
> Bien à vous,
> [Prénom] — My-Monkey

### 4.2 La « famille » des doku transports (backlinks thématiques faciles)
metrodoku.fr (Paris), lyondoku.fr, strasdoku.fr, ubahndoku.de (l'original). Les contacter pour un **cross-link** (page « autres villes » / « jeux similaires »). Très pertinent thématiquement → excellent signal.

### 4.3 Propriétés My-Monkey (dofollow, immédiat, gratuit)
- **blog.my-monkey.fr** : un article (annonce ou post-mortem technique OSM/GTFS) qui lie tamdoku.fr. Le blog a un peu d'ancienneté → transmet du jus.
- **my-monkey.fr** (landing) : s'assurer que Tamdoku est listé avec un lien (via le bloc `site` du `.monkey`, déjà en place).
- **games.my-monkey.fr** : lien croisé.
- **dle.tamdoku.fr** (statiodle) : lien croisé (déjà fait dans les deux sens).

### 4.4 Communautés & annuaires
- **Reddit** : r/Montpellier (poste déjà existant — le garder vivant), r/france sur un angle jeu.
- **Product Hunt** + **Hacker News** (« Show HN: Tamdoku – the daily tram-station sudoku of Montpellier »).
- Annuaires de jeux type Wordle FR : listes « jeux du jour », « alternatives Wordle françaises », framalibre, etc.
- Groupes Facebook locaux (« Tu sais que tu viens de Montpellier quand… », étudiants Montpellier).

## 5. Ce qui a été fait côté code (ce commit)

- **Footer de contenu crawlable** dans `index.html` (hors `#root`, présent dans le HTML brut sans JS) : explication du jeu, comment jouer, les 5 lignes TaM, FAQ, liens internes `<a>` vers `/regles` `/a-propos` `/archive`. Élargit le filet long-tail + donne à Google des liens internes suivables (avant, la nav était en `<button>`, non suivie).
- **FAQPage JSON-LD** (schema.org) adossé à la FAQ visible.
- **Métas par route** (`src/seo.ts`) : `/regles`, `/a-propos`, `/archive` ont désormais leur propre `title` / `description` / `canonical` / OG. Avant, toutes les routes SPA partageaient les métas de la home → doublons pour Google.
- **sitemap.xml** : ajout de `/regles`, `/a-propos`, `/archive`.

Limite connue (SPA) : le HTML **brut** de `/regles` etc. porte encore les métas de la home ; ce sont le rendu JS + le footer statique qui portent le contenu distinct. Googlebot rend le JS, donc ça fonctionne, mais si un jour on veut du bulletproof → prérendu au build (non fait, ROI faible à ce stade).

## 6. Attentes réalistes

- Le SEO local sur domaine neuf = **6 à 12 semaines** pour bouger, davantage sans backlinks.
- L'accélérateur, ce sont les **backlinks/presse** (§4) + **GSC** (§2), pas d'autres balises.
- Mesurer dans GSC, pas dans Google en navigation privée (résultats personnalisés/localisés trompeurs).
