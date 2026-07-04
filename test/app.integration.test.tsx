// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";

// matchMedia n'existe pas dans jsdom ; l'app l'utilise pour le thème.
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    (q: string) => ({
      matches: false,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  );
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Système de représentants distincts : une station différente par case. */
function solve(valid: string[][]): string[] {
  const assign = new Array<string | null>(9).fill(null);
  const used = new Set<string>();
  const bt = (i: number): boolean => {
    if (i === 9) return true;
    for (const id of valid[i]!) {
      if (used.has(id)) continue;
      used.add(id);
      assign[i] = id;
      if (bt(i + 1)) return true;
      used.delete(id);
      assign[i] = null;
    }
    return false;
  };
  if (!bt(0)) throw new Error("pas d'assignation");
  return assign as string[];
}

const flush = () => act(async () => { await Promise.resolve(); });

describe("app — partie complète du jour (jsdom)", () => {
  it("rend l'accueil, joue les 9 cases et gagne le défi", async () => {
    const App = (await import("../src/App.tsx")).default;
    const { pool, byId } = await import("../src/data.ts");
    const { generateDaily, seedForDate } = await import("../engine/daily.ts");
    const { todayStr } = await import("../src/format.ts");

    const puzzle = generateDaily(pool, seedForDate(todayStr()));
    const answerNames = solve(puzzle.valid).map((id) => byId.get(id)!.name);

    render(<App />);

    // Accueil
    expect(screen.getByText("Tamdoku")).toBeTruthy();
    const play = screen.getByRole("button", { name: /Jouer le défi/ });
    await act(async () => fireEvent.click(play));

    // 9 cases, dans l'ordre row-major
    for (let ci = 0; ci < 9; ci++) {
      const plus = screen.getAllByText("＋")[0]!;
      await act(async () => fireEvent.click(plus));
      const input = screen.getByPlaceholderText(/station/i) as HTMLInputElement;
      await act(async () => fireEvent.change(input, { target: { value: answerNames[ci] } }));
      const ok = screen.getByRole("button", { name: "OK" });
      await act(async () => fireEvent.click(ok));
      await flush();
    }

    // Écran de victoire
    expect(screen.getByText("Terminus !")).toBeTruthy();
    expect(screen.getByText("/ 900 points d'originalité")).toBeTruthy();

    // Statistiques persistées
    const stats = JSON.parse(localStorage.getItem("tamdoku:stats")!);
    expect(stats.played).toBe(1);
    expect(stats.wins).toBe(1);
    expect(stats.bestScore).toBeGreaterThan(0);
    const streak = JSON.parse(localStorage.getItem("tamdoku:streak")!);
    expect(streak.current).toBe(1);
  });

  it("une réponse hors critère coûte un cœur", async () => {
    const App = (await import("../src/App.tsx")).default;
    const { pool, byId, stations } = await import("../src/data.ts");
    const { generateDaily, seedForDate } = await import("../engine/daily.ts");
    const { todayStr } = await import("../src/format.ts");
    const { satisfies } = await import("../src/data.ts");

    const puzzle = generateDaily(pool, seedForDate(todayStr()));
    render(<App />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Jouer le défi/ })));

    // Une station qui ne coche PAS le critère de la case 0
    const rowRule = puzzle.rows[0]!;
    const colRule = puzzle.cols[0]!;
    const wrong = stations.find((s) => !(satisfies(s, rowRule) && satisfies(s, colRule)))!;

    await act(async () => fireEvent.click(screen.getAllByText("＋")[0]!));
    const input = screen.getByPlaceholderText(/station/i) as HTMLInputElement;
    await act(async () => fireEvent.change(input, { target: { value: wrong.name } }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "OK" })));
    await flush();

    expect(screen.getByText(/ne coche pas les deux critères/)).toBeTruthy();
    // Un cœur éteint (♡) apparaît dans la barre de statut
    const hearts = document.querySelector(".hearts")!;
    expect(within(hearts as HTMLElement).getByText("♡")).toBeTruthy();
    expect(byId).toBeTruthy();
  });
});
