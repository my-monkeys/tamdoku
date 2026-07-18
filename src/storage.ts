/** Persistance locale (aucun compte requis, comme la maquette). */

export interface Stats {
  played: number;
  wins: number;
  bestScore: number;
}

export interface Streak {
  current: number;
  best: number;
  last: string;
}

export interface GameResult {
  won: boolean;
  score: number;
  solved: number;
  mistakes: number;
  stars: number;
  rare: string;
  emoji: string[];
  /** 1re ligne de tram de chaque case (null = case vide) — mini-grille colorée
   * et carte de partage. Absent des vieux résultats : fallback via l'emoji. */
  lines?: (number | null)[];
  /** Nb de stations dont le joueur est le premier à les donner (bonus pionnier). */
  firsts?: number;
}

export interface DailySave {
  cells: (string | null)[];
  mistakes: number;
  status: "playing" | "won" | "lost";
  result: GameResult | null;
  /** Cases pour lesquelles le joueur a demandé l'indice (plan) : 0 pt d'originalité. */
  hinted?: boolean[];
}

const NS = "tamdoku:";

export function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    /* quota / mode privé : on ignore, le jeu reste jouable en mémoire */
  }
}

export const DEFAULT_STATS: Stats = { played: 0, wins: 0, bestScore: 0 };
export const DEFAULT_STREAK: Streak = { current: 0, best: 0, last: "" };
