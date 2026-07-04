/**
 * Cœur logique du jeu, porté depuis la maquette (classe DCLogic) en hook React,
 * mais câblé au vrai engine : données network.json, résolution de saisie
 * (answer.ts), génération quotidienne déterministe (daily.ts) et score
 * d'originalité par notoriété (fame.ts).
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { generateDaily, seedForDate, type DailyPuzzle } from "../engine/daily.ts";
import { findStation, suggestStations } from "../engine/answer.ts";
import { originalityPoints } from "../engine/fame.ts";
import type { Station } from "../engine/types.ts";
import { fame, pool, satisfies, stations } from "./data.ts";
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

export const MAX_MISTAKES = 3;
export type Screen = "home" | "game" | "rules" | "stats" | "about";
export type Mode = "simple" | "expert";
export type Status = "idle" | "playing" | "won" | "lost";

export interface Game {
  screen: Screen;
  mode: Mode;
  game: "daily" | "practice";
  puzzle: DailyPuzzle | null;
  cells: (string | null)[];
  mistakes: number;
  sel: number;
  query: string;
  sheetOpen: boolean;
  sheetMsg: string;
  sheetMsgCls: "" | "bad" | "warn" | "good";
  shakeCell: number;
  infoCrit: string | null;
  status: Status;
  result: GameResult | null;
  resultHidden: boolean;
  toast: string;
  stats: Stats;
  streak: Streak;
  /** Grille du jour + éventuelle sauvegarde, pour l'accueil. */
  dailyPuzzle: DailyPuzzle;
  dailySave: DailySave | null;
}

function dailyKey(): string {
  return `daily:${todayStr()}`;
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
    mode: lsGet<Mode>("mode", "simple"),
    game: "daily",
    puzzle: null,
    cells: new Array(9).fill(null),
    mistakes: 0,
    sel: -1,
    query: "",
    sheetOpen: false,
    sheetMsg: "",
    sheetMsgCls: "",
    shakeCell: -1,
    infoCrit: null,
    status: "idle",
    result: null,
    resultHidden: false,
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
  const goScreen = useCallback((screen: Screen) => patch({ screen }), [patch]);
  const goHome = useCallback(
    () => patch({ screen: "home", sheetOpen: false, infoCrit: null, dailySave: lsGet(dailyKey(), null) }),
    [patch],
  );

  const setMode = useCallback(
    (mode: Mode) => {
      lsSet("mode", mode);
      patch({ mode });
    },
    [patch],
  );

  const saveDaily = useCallback((next: Partial<DailySave> & { forResult?: GameResult | null }) => {
    setG((prev) => {
      if (prev.game !== "daily") return prev;
      const save: DailySave = {
        cells: next.cells ?? prev.cells,
        mistakes: next.mistakes ?? prev.mistakes,
        status: (next.status ?? prev.status) as DailySave["status"],
        result: next.forResult !== undefined ? next.forResult : prev.result,
      };
      lsSet(dailyKey(), save);
      return { ...prev, dailySave: save };
    });
  }, []);

  const startDaily = useCallback(() => {
    const saved = lsGet<DailySave | null>(dailyKey(), null);
    if (saved) {
      patch({
        screen: "game", game: "daily", puzzle: dailyPuzzle,
        cells: saved.cells, mistakes: saved.mistakes, status: saved.status,
        result: saved.result, resultHidden: false, sel: -1, sheetOpen: false, query: "", sheetMsg: "",
      });
      return;
    }
    patch({
      screen: "game", game: "daily", puzzle: dailyPuzzle,
      cells: new Array(9).fill(null), mistakes: 0, status: "playing",
      result: null, resultHidden: false, sel: -1, sheetOpen: false, query: "", sheetMsg: "",
    });
  }, [dailyPuzzle, patch]);

  const startPractice = useCallback(() => {
    const seed = (seedForDate(todayStr()) ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    const puzzle = generateDaily(pool, seed);
    patch({
      screen: "game", game: "practice", puzzle,
      cells: new Array(9).fill(null), mistakes: 0, status: "playing",
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
  const setQuery = useCallback((query: string) => patch({ query, sheetMsg: "" }), [patch]);

  const toast = useCallback(
    (msg: string) => {
      patch({ toast: msg });
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => patch({ toast: "" }), 1700);
    },
    [patch],
  );

  const finish = useCallback((won: boolean, finalCells: (string | null)[], mistakes: number, game: "daily" | "practice") => {
    let score = 0;
    let rare: Station | null = null;
    for (const id of finalCells) {
      if (!id) continue;
      const f = fame.get(id) ?? 5;
      score += originalityPoints(f);
      if (!rare || f < (fame.get(rare.id) ?? 5)) rare = stations.find((s) => s.id === id) ?? rare;
    }
    score = Math.max(0, score - mistakes * 20);
    const solved = finalCells.filter(Boolean).length;
    const stars = won ? (mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1) : solved >= 6 ? 1 : 0;
    const result: GameResult = {
      won, score, solved, mistakes, stars,
      rare: rare?.name ?? "—", emoji: emojiGrid(finalCells),
    };
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
      return { ...prev, status: won ? "won" : "lost", result, resultHidden: false, stats, streak };
    });
    if (game === "daily") saveDaily({ cells: finalCells, mistakes, status: won ? "won" : "lost", forResult: result });
  }, [saveDaily]);

  const registerMistake = useCallback((msg: string) => {
    buzz(70);
    setG((prev) => {
      const mistakes = prev.mistakes + 1;
      if (mistakes >= MAX_MISTAKES) {
        window.setTimeout(() => {
          setG((p) => ({ ...p, sheetOpen: false, sel: -1 }));
          finish(false, prev.cells, mistakes, prev.game);
        }, 680);
      } else if (prev.game === "daily") {
        saveDaily({ mistakes });
      }
      return { ...prev, mistakes, sheetMsg: msg, sheetMsgCls: "bad", shakeCell: prev.sel };
    });
    window.setTimeout(() => patch({ shakeCell: -1 }), 380);
  }, [finish, patch, saveDaily]);

  const submit = useCallback((text: string) => {
    setG((prev) => {
      if (prev.status !== "playing" || prev.sel < 0) return prev;
      const station = findStation(text, stations);
      if (!station) return { ...prev, sheetMsg: "Station inconnue — vérifie l’orthographe", sheetMsgCls: "warn" };
      if (prev.cells.includes(station.id)) {
        queueMicrotask(() => registerMistake(`« ${station.name} » est déjà placée ailleurs`));
        return prev;
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
      if (won) queueMicrotask(() => finish(true, cells, prev.mistakes, prev.game));
      else if (prev.game === "daily") queueMicrotask(() => saveDaily({ cells }));
      return { ...prev, cells, sheetOpen: false, sel: -1, query: "", sheetMsg: "" };
    });
  }, [finish, registerMistake, saveDaily]);

  const reopenResult = useCallback(() => patch({ resultHidden: false }), [patch]);
  const hideResult = useCallback(() => patch({ resultHidden: true }), [patch]);

  // Suggestions (mode simple)
  const suggestions = useMemo<Station[]>(() => {
    if (g.mode !== "simple" || !g.sheetOpen || !g.query) return [];
    return suggestStations(g.query, stations, { fame, exclude: new Set(g.cells.filter(Boolean) as string[]) });
  }, [g.mode, g.sheetOpen, g.query, g.cells]);

  // Nombre de réponses restantes pour la case sélectionnée
  const remainingForSel = useMemo(() => {
    if (!g.puzzle || g.sel < 0) return 0;
    return (g.puzzle.valid[g.sel] ?? []).filter((id) => !g.cells.includes(id)).length;
  }, [g.puzzle, g.sel, g.cells]);

  return {
    g, inputRef, suggestions, remainingForSel,
    goScreen, goHome, setMode, startDaily, startPractice,
    openSheet, closeSheet, openInfo, closeInfo, setQuery, submit,
    toast, reopenResult, hideResult,
  };
}
