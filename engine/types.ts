export type LineRef = "1" | "2" | "3" | "4" | "5";

export interface Station {
  /** Slug stable, dérivé du nom canonique (ex. "gare-saint-roch"). */
  id: string;
  /** Nom canonique affiché, aligné sur la signalétique TaM. */
  name: string;
  /** Variantes acceptées en saisie (noms GTFS, quais directionnels OSM, anciens noms). */
  aliases: string[];
  /** Lignes qui desservent la station en service nominal (lignes directes uniquement). */
  lines: LineRef[];
  lat: number;
  lon: number;
  /** Commune INSEE (ex. "Montpellier", "Castelnau-le-Lez"). */
  commune: string;
  /** Lignes dont la station est un terminus. */
  terminusOf: LineRef[];
  /** Station desservie par un parking-relais P+Tram. */
  parkRide: boolean;
  /**
   * Tags sémantiques curés (pipeline/curation.json) :
   * "personnalite", "saint", "espace-vert", "sport", "enseignement", "eau", "gare-sncf", "sante".
   */
  tags: string[];
}

export interface Line {
  ref: LineRef;
  name: string;
  color: string;
  circular: boolean;
  /** Ids des stations terminus (vide pour la ligne circulaire). */
  termini: string[];
  /** Séquences ordonnées d'ids de stations, une par branche (sens aller). */
  branches: string[][];
}

export interface Network {
  generatedAt: string;
  source: string;
  stations: Station[];
  lines: Line[];
}

export type RuleFamily = "ligne" | "reseau" | "nom" | "semantique" | "geo";

export interface Rule {
  id: string;
  family: RuleFamily;
  /** Sous-famille pour les contraintes de diversité (ex. "contient-lettre"). */
  subfamily: string;
  /** Libellé court affiché sur l'axe de la grille. */
  label: string;
  /** Explication complète affichée au « ? ». */
  description: string;
  test: (station: Station) => boolean;
}

/** Règle compilée contre un réseau : son ensemble de stations. */
export interface CompiledRule extends Rule {
  stationIds: ReadonlySet<string>;
}

export interface Grid {
  /** Date ISO (YYYY-MM-DD) du puzzle. */
  date: string;
  /** Numéro du puzzle depuis l'epoch. */
  number: number;
  rows: [string, string, string];
  cols: [string, string, string];
  /** Solutions par case, indexées [row][col], triées par id. */
  solutions: string[][][];
  difficulty: number;
}
