/**
 * Cœur logique du jeu, porté depuis la maquette (classe DCLogic) en hook React,
 * mais câblé au vrai engine : données network.json, résolution de saisie
 * (answer.ts), génération quotidienne déterministe (daily.ts) et score
 * d'originalité par notoriété (fame.ts).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parsePath, pathFor, type Route } from "./routes.ts";
import { applyRouteMeta } from "./seo.ts";
import { generateDaily, seedForDate, type DailyPuzzle } from "../engine/daily.ts";
import { findStation, suggestStations } from "../engine/answer.ts";
import type { Station } from "../engine/types.ts";
import { track } from "./analytics.ts";
import { fame, pool, satisfies, stations } from "./data.ts";
import { cachedDay, cellScore, fetchAnswers, submitResults, warmPopularity, type CellAnswers } from "./stats.ts";
import { emojiGrid, todayStr, yesterdayStr } from "./format.ts";
import {
  DEFAULT_STATS,
  DEFAULT_STREAK,
  lsGet,
  lsSet,
  type DailySave,
  type GameResult,
  type Stats,
  type Streak,
} from "./storage.ts";

/** Fautes autorisées selon le mode : Expert garde la tension, Simple pardonne
 * davantage (la donnée montre une falaise « perdu à 8/9 » sur la limite à 3). */
export const MISTAKES_EXPERT = 3;
export const MISTAKES_SIMPLE = 5;
export const maxMistakesFor = (mode: Mode): number =>
  mode === "expert" ? MISTAKES_EXPERT : MISTAKES_SIMPLE;
/** Bonus par station dont le joueur est le tout premier à la donner (pionnier). */
export const FIRST_BONUS = 15;
/** Première grille de l'archive (nº 1). */
export const LAUNCH_DATE = "2026-07-01";
export type Screen = "home" | "game" | "rules" | "stats" | "about" | "archive";
export type Mode = "simple" | "expert";
export type Status = "idle" | "playing" | "won" | "lost";
export type GameType = "daily" | "practice" | "archive";

export interface Game {
  screen: Screen;
  /** Écran d'où l'on a ouvert un écran de contenu (règles/à propos/stats) → pour y revenir. */
  returnTo: Screen;
  mode: Mode;
  game: GameType;
  /** Date (YYYY-MM-DD) de la grille en cours ; "" pour l'entraînement. */
  puzzleDate: string;
  puzzle: DailyPuzzle | null;
  cells: (string | null)[];
  mistakes: number;
  /** Cases indicées (plan) : n'entrent pas dans le score d'originalité. */
  hinted: boolean[];
  /** Case dont on affiche le plan-indice ; -1 = fermé. */
  hintMapCell: number;
  sel: number;
  query: string;
  sheetOpen: boolean;
  sheetMsg: string;
  sheetMsgCls: "" | "bad" | "warn" | "good";
  shakeCell: number;
  infoCrit: string | null;
  /** Modale de retour utilisateur ouverte. */
  feedbackOpen: boolean;
  /** Diagramme « lignes à plat » (aide : reconnaître les stations par leur nom). */
  linesOpen: boolean;
  status: Status;
  result: GameResult | null;
  resultHidden: boolean;
  /** Case dont on affiche les stats de réponses (grille finie) ; -1 = fermé. */
  statsCell: number;
  cellStats: CellAnswers[] | null;
  toast: string;
  stats: Stats;
  streak: Streak;
  /** Grille du jour + éventuelle sauvegarde, pour l'accueil. */
  dailyPuzzle: DailyPuzzle;
  dailySave: DailySave | null;
}

const DAY_MS = 86_400_000;
const pad2 = (x: number) => String(x).padStart(2, "0");
const saveKey = (date: string) => `daily:${date}`;
const dailyKey = () => saveKey(todayStr());

/** Charge la sauvegarde d'une date (browser-safe, utilisé par l'écran Archive). */
export function loadDaySave(date: string): DailySave | null {
  return lsGet<DailySave | null>(saveKey(date), null);
}

function dayNum(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor(Date.UTC(y!, m! - 1, d!) / DAY_MS);
}
function dateOfDayNum(n: number): string {
  const dt = new Date(n * DAY_MS);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

/** Numéro de la grille (nº 1 = jour de lancement). */
export function puzzleNumber(date: string): number {
  return dayNum(date) - dayNum(LAUNCH_DATE) + 1;
}

/** Dates du lancement à aujourd'hui, la plus récente d'abord. */
export function archiveDates(): string[] {
  const start = dayNum(LAUNCH_DATE);
  const end = dayNum(todayStr());
  const out: string[] = [];
  for (let n = end; n >= start; n--) out.push(dateOfDayNum(n));
  return out;
}

function buzz(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* pas de vibreur : sans effet */
  }
}

export function useGame() {
  const dailyPuzzle = useMemo(() => generateDaily(pool, seedForDate(todayStr())), []);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const [g, setG] = useState<Game>(() => ({
    screen: "home",
    returnTo: "home",
    mode: lsGet<Mode>("mode", "simple"),
    game: "daily",
    puzzleDate: todayStr(),
    puzzle: null,
    cells: new Array(9).fill(null),
    mistakes: 0,
    hinted: new Array(9).fill(false),
    hintMapCell: -1,
    sel: -1,
    query: "",
    sheetOpen: false,
    sheetMsg: "",
    sheetMsgCls: "",
    shakeCell: -1,
    infoCrit: null,
    feedbackOpen: false,
    linesOpen: false,
    status: "idle",
    result: null,
    resultHidden: false,
    statsCell: -1,
    cellStats: null,
    toast: "",
    stats: lsGet<Stats>("stats", DEFAULT_STATS),
    streak: lsGet<Streak>("streak", DEFAULT_STREAK),
    dailyPuzzle,
    dailySave: lsGet<DailySave | null>(dailyKey(), null),
  }));

  const patch = useCallback((p: Partial<Game> | ((prev: Game) => Partial<Game>)) => {
    setG((prev) => ({ ...prev, ...(typeof p === "function" ? p(prev) : p) }));
  }, []);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goScreen = useCallback(
    (screen: Screen) => {
      if (screen === "rules" || screen === "stats" || screen === "about" || screen === "archive") {
        track("view", { screen });
      }
      setG((prev) => ({ ...prev, screen, returnTo: prev.screen }));
    },
    [],
  );
  const goHome = useCallback(
    () => patch({ screen: "home", sheetOpen: false, infoCrit: null, dailySave: lsGet(dailyKey(), null) }),
    [patch],
  );
  /** Revient à l'écran d'origine (jeu en cours ou accueil) depuis un écran de contenu. */
  const goBack = useCallback(() => {
    setG((prev) =>
      prev.returnTo === "home"
        ? { ...prev, screen: "home", sheetOpen: false, infoCrit: null, dailySave: lsGet(dailyKey(), null) }
        : { ...prev, screen: prev.returnTo, sheetOpen: false, infoCrit: null },
    );
  }, []);

  const setMode = useCallback(
    (mode: Mode) => {
      lsSet("mode", mode);
      patch({ mode });
    },
    [patch],
  );

  /** Sauve la partie en cours sous sa date (défi ET archive) ; l'entraînement n'est pas sauvé. */
  const savePlay = useCallback((next: Partial<DailySave> & { forResult?: GameResult | null }) => {
    setG((prev) => {
      if (prev.game !== "daily" && prev.game !== "archive") return prev;
      const save: DailySave = {
        cells: next.cells ?? prev.cells,
        mistakes: next.mistakes ?? prev.mistakes,
        status: (next.status ?? prev.status) as DailySave["status"],
        result: next.forResult !== undefined ? next.forResult : prev.result,
        hinted: next.hinted ?? prev.hinted,
      };
      lsSet(saveKey(prev.puzzleDate), save);
      // dailySave (carte d'accueil) ne reflète QUE la grille du jour.
      return prev.puzzleDate === todayStr() ? { ...prev, dailySave: save } : prev;
    });
  }, []);

  const startDaily = useCallback(() => {
    warmPopularity(todayStr());
    const saved = lsGet<DailySave | null>(dailyKey(), null);
    if (saved) {
      patch({
        screen: "game", game: "daily", puzzleDate: todayStr(), puzzle: dailyPuzzle,
        cells: saved.cells, mistakes: saved.mistakes, status: saved.status,
        hinted: saved.hinted ?? new Array(9).fill(false), hintMapCell: -1,
        result: saved.result, resultHidden: false, sel: -1, sheetOpen: false, query: "", sheetMsg: "",
      });
      return;
    }
    track("play", { mode: lsGet<Mode>("mode", "simple"), game: "daily" });
    patch({
      screen: "game", game: "daily", puzzleDate: todayStr(), puzzle: dailyPuzzle,
      cells: new Array(9).fill(null), mistakes: 0, status: "playing",
      hinted: new Array(9).fill(false), hintMapCell: -1,
      result: null, resultHidden: false, sel: -1, sheetOpen: false, query: "", sheetMsg: "",
    });
  }, [dailyPuzzle, patch]);

  /** Rejoue une grille passée (bonus : ne compte pas dans la série quotidienne). */
  const startArchive = useCallback(
    (date: string) => {
      if (date === todayStr()) {
        startDaily();
        return;
      }
      warmPopularity(date);
      const puzzle = generateDaily(pool, seedForDate(date));
      const saved = loadDaySave(date);
      const common = {
        screen: "game" as const, game: "archive" as const, puzzleDate: date, puzzle,
        hintMapCell: -1, resultHidden: false, sel: -1, sheetOpen: false, query: "", sheetMsg: "",
      };
      if (saved) {
        patch({
          ...common, cells: saved.cells, mistakes: saved.mistakes, status: saved.status,
          hinted: saved.hinted ?? new Array(9).fill(false), result: saved.result,
        });
        return;
      }
      track("play", { mode: lsGet<Mode>("mode", "simple"), game: "archive" });
      patch({
        ...common, cells: new Array(9).fill(null), mistakes: 0, status: "playing",
        hinted: new Array(9).fill(false), result: null,
      });
    },
    [patch, startDaily],
  );

  const startPractice = useCallback(() => {
    const seed = (seedForDate(todayStr()) ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    const puzzle = generateDaily(pool, seed);
    track("play", { mode: lsGet<Mode>("mode", "simple"), game: "practice" });
    patch({
      screen: "game", game: "practice", puzzleDate: "", puzzle,
      cells: new Array(9).fill(null), mistakes: 0, status: "playing",
      hinted: new Array(9).fill(false), hintMapCell: -1,
      result: null, resultHidden: false, sel: -1, sheetOpen: false, query: "", sheetMsg: "",
    });
  }, [patch]);

  // ── Feuille de saisie ─────────────────────────────────────────────────────
  const openSheet = useCallback(
    (ci: number) => {
      setG((prev) => (prev.status !== "playing" ? prev : { ...prev, sel: ci, sheetOpen: true, query: "", sheetMsg: "", sheetMsgCls: "" }));
      window.setTimeout(() => inputRef.current?.focus(), 60);
    },
    [],
  );
  const closeSheet = useCallback(() => patch({ sheetOpen: false, sel: -1, query: "", sheetMsg: "" }), [patch]);
  const openInfo = useCallback((critId: string) => patch({ infoCrit: critId }), [patch]);
  const closeInfo = useCallback(() => patch({ infoCrit: null }), [patch]);

  const openFeedback = useCallback(() => {
    track("feedback_open");
    patch({ feedbackOpen: true });
  }, [patch]);
  const closeFeedback = useCallback(() => patch({ feedbackOpen: false }), [patch]);

  const openLines = useCallback(() => {
    track("lines_open");
    patch({ linesOpen: true });
  }, [patch]);
  const closeLines = useCallback(() => patch({ linesOpen: false }), [patch]);

  /** Demande l'indice-plan pour la case sélectionnée (0 pt d'originalité sur cette case). */
  const useHint = useCallback(() => {
    setG((prev) => {
      if (prev.status !== "playing" || prev.sel < 0) return prev;
      const ci = prev.sel;
      if (prev.hinted[ci]) return { ...prev, hintMapCell: ci }; // déjà indicée : on rouvre juste le plan
      const hinted = prev.hinted.slice();
      hinted[ci] = true;
      track("hint", { game: prev.game, mode: prev.mode });
      if (prev.game === "daily" || prev.game === "archive") queueMicrotask(() => savePlay({ hinted }));
      return { ...prev, hinted, hintMapCell: ci };
    });
  }, [savePlay]);
  const closeHintMap = useCallback(() => patch({ hintMapCell: -1 }), [patch]);
  const setQuery = useCallback((query: string) => patch({ query, sheetMsg: "" }), [patch]);

  const toast = useCallback(
    (msg: string) => {
      patch({ toast: msg });
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => patch({ toast: "" }), 1700);
    },
    [patch],
  );

  const finish = useCallback(
    (won: boolean, finalCells: (string | null)[], mistakes: number, game: GameType, date: string, hinted: boolean[]) => {
    // Distribution réelle du jour si consolidée, sinon fallback fame par case.
    const dist = date ? cachedDay(date) : null;
    let score = 0;
    let rare: Station | null = null;
    let rarest = -1;
    for (let ci = 0; ci < finalCells.length; ci++) {
      const id = finalCells[ci];
      if (!id) continue;
      // Case indicée (plan) : 0 pt d'originalité, et non éligible au "coup rare".
      if (hinted[ci]) continue;
      const { points, rarity } = cellScore(id, dist?.[ci], fame.get(id) ?? 5);
      score += points;
      if (rarity > rarest) {
        rarest = rarity;
        rare = stations.find((s) => s.id === id) ?? rare;
      }
    }
    score = Math.max(0, score - mistakes * 20);
    const solved = finalCells.filter(Boolean).length;
    const stars = won ? (mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1) : solved >= 6 ? 1 : 0;
    const result: GameResult = {
      won, score, solved, mistakes, stars,
      rare: rare?.name ?? "—", emoji: emojiGrid(finalCells),
    };
    track(won ? "win" : "loss", { game, score, solved, mistakes });
    setG((prev) => {
      const stats: Stats = { ...prev.stats };
      stats.played++;
      if (won) stats.wins++;
      if (score > stats.bestScore) stats.bestScore = score;
      let streak = prev.streak;
      if (game === "daily" && won) {
        const t = todayStr();
        if (streak.last !== t) {
          streak = {
            current: streak.last === yesterdayStr() ? streak.current + 1 : 1,
            best: 0, last: t,
          };
          streak.best = Math.max(prev.streak.best, streak.current);
        }
      }
      lsSet("stats", stats);
      lsSet("streak", streak);
      buzz(won ? [25, 45, 25] : 200);
      return { ...prev, status: won ? "won" : "lost", result, resultHidden: false, statsCell: -1, stats, streak };
    });
    if (game === "daily" || game === "archive") {
      savePlay({ cells: finalCells, mistakes, status: won ? "won" : "lost", forResult: result, hinted });
      // Bonus pionnier : à la réponse du submit, +FIRST_BONUS par station dont le
      // joueur est le premier à l'avoir donnée. Non bloquant : le résultat est
      // déjà affiché, on met à jour le score si un bonus arrive.
      void submitResults(date, finalCells).then((outcome) => {
        const firsts = outcome?.ok && outcome.firsts ? outcome.firsts.length : 0;
        if (firsts === 0) return;
        const bonused: GameResult = { ...result, score: result.score + firsts * FIRST_BONUS, firsts };
        setG((prev) => {
          if (prev.result !== result) return prev; // le joueur est passé à autre chose
          const stats: Stats = { ...prev.stats };
          if (bonused.score > stats.bestScore) stats.bestScore = bonused.score;
          lsSet("stats", stats);
          return { ...prev, result: bonused, stats };
        });
        const saved = lsGet<DailySave | null>(saveKey(date), null);
        if (saved?.result) lsSet(saveKey(date), { ...saved, result: bonused });
      });
    }
    },
    [savePlay],
  );

  const registerMistake = useCallback((msg: string) => {
    buzz(70);
    setG((prev) => {
      const mistakes = prev.mistakes + 1;
      if (mistakes >= maxMistakesFor(prev.mode)) {
        window.setTimeout(() => {
          setG((p) => ({ ...p, sheetOpen: false, sel: -1 }));
          finish(false, prev.cells, mistakes, prev.game, prev.puzzleDate, prev.hinted);
        }, 680);
      } else if (prev.game === "daily" || prev.game === "archive") {
        savePlay({ mistakes });
      }
      return { ...prev, mistakes, sheetMsg: msg, sheetMsgCls: "bad", shakeCell: prev.sel };
    });
    window.setTimeout(() => patch({ shakeCell: -1 }), 380);
  }, [finish, patch, savePlay]);

  const submit = useCallback((text: string) => {
    setG((prev) => {
      if (prev.status !== "playing" || prev.sel < 0) return prev;
      const station = findStation(text, stations);
      if (!station) return { ...prev, sheetMsg: "Station inconnue — vérifie l’orthographe", sheetMsgCls: "warn" };
      if (prev.cells.includes(station.id)) {
        // Doublon = trou de mémoire, pas une erreur de raisonnement : on avertit sans pénaliser.
        return { ...prev, sheetMsg: `« ${station.name} » est déjà placée ailleurs`, sheetMsgCls: "warn" };
      }
      const ci = prev.sel;
      const ok = satisfies(station, prev.puzzle!.rows[Math.floor(ci / 3)]!) && satisfies(station, prev.puzzle!.cols[ci % 3]!);
      if (!ok) {
        queueMicrotask(() => registerMistake(`« ${station.name} » ne coche pas les deux critères`));
        return prev;
      }
      const cells = prev.cells.slice();
      cells[ci] = station.id;
      buzz(18);
      const won = cells.every(Boolean);
      if (won) queueMicrotask(() => finish(true, cells, prev.mistakes, prev.game, prev.puzzleDate, prev.hinted));
      else if (prev.game === "daily" || prev.game === "archive") queueMicrotask(() => savePlay({ cells }));
      return { ...prev, cells, sheetOpen: false, sel: -1, query: "", sheetMsg: "" };
    });
  }, [finish, registerMistake, savePlay]);

  const reopenResult = useCallback(() => patch({ resultHidden: false }), [patch]);
  const hideResult = useCallback(() => patch({ resultHidden: true }), [patch]);

  // Stats de réponses d'une case, uniquement grille finie (sinon = indice/triche).
  const openCellStats = useCallback(
    (ci: number) =>
      setG((prev) => {
        const finished = prev.status === "won" || prev.status === "lost";
        return finished && prev.puzzleDate ? { ...prev, statsCell: ci } : prev;
      }),
    [],
  );
  const closeCellStats = useCallback(() => patch({ statsCell: -1 }), [patch]);

  // ── Routeur : URL ↔ écran ───────────────────────────────────────────────────
  const applyRoute = useCallback(
    (r: Route) => {
      if (r.name === "grid") startArchive(r.date);
      else if (r.name === "archive" || r.name === "rules" || r.name === "stats" || r.name === "about") {
        patch({ screen: r.name });
      } else goHome();
    },
    [patch, startArchive, goHome],
  );

  // Précharge la distribution du jour dès l'accueil (le scoring de fin est synchrone).
  useEffect(() => {
    warmPopularity(todayStr());
  }, []);

  // Grille finie & datée → charge la distribution live des réponses par case.
  useEffect(() => {
    const finished = g.status === "won" || g.status === "lost";
    if (!finished || !g.puzzleDate) return;
    let cancelled = false;
    void fetchAnswers(g.puzzleDate).then((cells) => {
      if (!cancelled && cells) setG((p) => ({ ...p, cellStats: cells }));
    });
    return () => {
      cancelled = true;
    };
  }, [g.status, g.puzzleDate]);

  const didMount = useRef(false);
  useEffect(() => {
    applyRoute(parsePath(window.location.pathname));
    const onPop = () => applyRoute(parsePath(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [applyRoute]);

  useEffect(() => {
    const path = pathFor(g.screen, g.game, g.puzzleDate);
    if (!didMount.current) {
      didMount.current = true;
    } else if (path !== window.location.pathname) {
      window.history.pushState(null, "", path);
    }
    // Title, description, canonical, robots et OG par écran (les routes SPA
    // partagent le même HTML brut : sans ça, Google les voit comme des doublons).
    applyRouteMeta(g.screen, g.game, g.puzzleDate);
  }, [g.screen, g.game, g.puzzleDate]);

  // Suggestions (mode simple) : dès le 1er caractère, jusqu'à 6 propositions.
  const suggestions = useMemo<Station[]>(() => {
    if (g.mode !== "simple" || !g.sheetOpen || g.query.trim().length < 1) return [];
    return suggestStations(g.query, stations, {
      fame,
      exclude: new Set(g.cells.filter(Boolean) as string[]),
      limit: 6,
    });
  }, [g.mode, g.sheetOpen, g.query, g.cells]);

  // Nombre de réponses restantes pour la case sélectionnée
  const remainingForSel = useMemo(() => {
    if (!g.puzzle || g.sel < 0) return 0;
    return (g.puzzle.valid[g.sel] ?? []).filter((id) => !g.cells.includes(id)).length;
  }, [g.puzzle, g.sel, g.cells]);

  return {
    g, inputRef, suggestions, remainingForSel,
    goScreen, goHome, goBack, setMode, startDaily, startPractice, startArchive,
    openSheet, closeSheet, openInfo, closeInfo, openFeedback, closeFeedback, setQuery, submit,
    toast, reopenResult, hideResult, openCellStats, closeCellStats,
    useHint, closeHintMap, openLines, closeLines,
  };
}
