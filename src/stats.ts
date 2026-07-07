/**
 * Stats d'originalité « réelles » : la SPA envoie les bonnes réponses (qui tape
 * quoi) et lit la distribution consolidée chaque nuit. Tant qu'une case n'a pas
 * assez de réponses, on retombe sur le cold-start heuristique (engine/fame.ts).
 *
 * Tout est best-effort : si le backend est injoignable, le jeu reste jouable et
 * le score bascule sur le fallback fame. Aucune donnée personnelle — juste un id
 * anonyme tiré au hasard, stocké en local.
 */
import { originalityPoints } from "../engine/fame.ts";

const STATS_API = "https://t-api.my-monkey.fr";
/** En-dessous, la distribution n'est pas assez fiable : on garde le fallback fame. */
const MIN_SAMPLES = 20;

// Stats actives en prod uniquement : ni les tests (jsdom), ni le dev local, ni
// une preprod ne doivent toucher au backend (pas de pollution des vraies stats).
const ENABLED = typeof window !== "undefined" && /(^|\.)tamdoku\.fr$/.test(window.location.hostname);

/** Distribution des réponses pour une case d'un jour donné. */
export interface CellDist {
  total: number;
  counts: Record<string, number>;
}

function anonId(): string {
  const KEY = "tamdoku:anon";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "anon-ephemere-0000";
  }
}

/** Envoie les cases correctement remplies (fire-and-forget, dédup côté serveur). */
export function submitResults(date: string, cells: (string | null)[]): void {
  if (!ENABLED || !date) return;
  const payload = cells
    .map((station, cell) => (station ? { cell, station } : null))
    .filter((c): c is { cell: number; station: string } => c !== null);
  if (payload.length === 0) return;
  void fetch(`${STATS_API}/submit`, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, anon: anonId(), cells: payload }),
  }).catch(() => {
    /* best-effort : le jeu n'en dépend pas */
  });
}

const dayCache = new Map<string, CellDist[] | null>();

/** Précharge la distribution d'un jour pour que le scoring de fin soit synchrone. */
export function warmPopularity(date: string): void {
  if (!ENABLED || !date || dayCache.has(date)) return;
  dayCache.set(date, null); // évite les requêtes concurrentes
  void fetch(`${STATS_API}/popularity?date=${date}`)
    .then((r) => r.json())
    .then((j: { day?: CellDist[] | null }) => dayCache.set(date, j.day ?? null))
    .catch(() => dayCache.set(date, null));
}

/** Distribution déjà en cache (ou null si absente / pas encore chargée). */
export function cachedDay(date: string): CellDist[] | null {
  return dayCache.get(date) ?? null;
}

/**
 * Points + rareté [0..1] d'une réponse. Avec assez de données : part réelle des
 * joueurs (rare = peu de monde a donné cette station). Sinon fallback fame.
 */
export function cellScore(
  station: string,
  dist: CellDist | undefined,
  fallbackFame: number,
): { points: number; rarity: number } {
  if (dist && dist.total >= MIN_SAMPLES) {
    const p = (dist.counts[station] ?? 0) / dist.total;
    const rarity = 1 - p;
    return { points: Math.round(40 + 60 * rarity), rarity };
  }
  return { points: originalityPoints(fallbackFame), rarity: (10 - fallbackFame) / 10 };
}
