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
  window.history.replaceState(null, "", "/");
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
    expect(screen.getByText(/points d.originalit/i)).toBeTruthy();

    // Statistiques persistées
    const stats = JSON.parse(localStorage.getItem("tamdoku:stats")!);
    expect(stats.played).toBe(1);
    expect(stats.wins).toBe(1);
    expect(stats.bestScore).toBeGreaterThan(0);
    const streak = JSON.parse(localStorage.getItem("tamdoku:streak")!);
    expect(streak.current).toBe(1);

    // « Voir la grille » masque le résultat, la pastille « Retour » le rouvre
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Voir la grille" })));
    await flush();
    expect(screen.queryByText("Terminus !")).toBeNull();
    const reopen = document.querySelector(".reopen") as HTMLElement;
    expect(reopen).toBeTruthy();
    await act(async () => fireEvent.click(reopen));
    await flush();
    expect(screen.getByText("Terminus !")).toBeTruthy();
  });

  it("l'archive : rejouer un jour passé est un bonus (n'incrémente pas la série)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-10T10:00:00"));
    try {
      const App = (await import("../src/App.tsx")).default;
      const { pool, byId } = await import("../src/data.ts");
      const { generateDaily, seedForDate } = await import("../engine/daily.ts");
      const { archiveDates } = await import("../src/useGame.ts");

      render(<App />);
      await act(async () => fireEvent.click(screen.getByRole("button", { name: "Archive" })));
      expect(screen.getByText("Archive")).toBeTruthy();
      expect(window.location.pathname).toBe("/archive");

      const past = archiveDates()[1]!; // la veille = 2026-07-09
      const names = solve(generateDaily(pool, seedForDate(past)).valid).map((id) => byId.get(id)!.name);

      const rows = document.querySelectorAll(".arow");
      await act(async () => fireEvent.click(rows[1] as HTMLElement));
      expect(window.location.pathname).toBe(`/archive/${past}`);
      for (let ci = 0; ci < 9; ci++) {
        await act(async () => fireEvent.click(screen.getAllByText("＋")[0]!));
        const input = screen.getByPlaceholderText(/station/i) as HTMLInputElement;
        await act(async () => fireEvent.change(input, { target: { value: names[ci] } }));
        await act(async () => fireEvent.click(screen.getByRole("button", { name: "OK" })));
        await flush();
      }
      expect(screen.getByText("Terminus !")).toBeTruthy();
      // bonus : la série reste à 0
      const streak = JSON.parse(localStorage.getItem("tamdoku:streak") ?? "null");
      expect(streak?.current ?? 0).toBe(0);
      // mais la grille passée est sauvegardée sous sa date
      expect(localStorage.getItem("tamdoku:daily:2026-07-09")).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("une grille passée pose meta robots=noindex, l'accueil reste indexable", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-10T10:00:00"));
    try {
      document.head.innerHTML = '<meta name="robots" content="index, follow" />';
      window.history.replaceState(null, "", "/archive/2026-07-05");
      const App = (await import("../src/App.tsx")).default;
      const { unmount } = render(<App />);
      await flush();
      expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toContain(
        "noindex",
      );
      // retour à l'accueil → réindexable
      unmount();
      window.history.replaceState(null, "", "/");
      render(<App />);
      await flush();
      expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).not.toContain(
        "noindex",
      );
    } finally {
      vi.useRealTimers();
      document.head.innerHTML = "";
    }
  });

  it("un lien direct /regles ouvre l'écran des règles", async () => {
    window.history.replaceState(null, "", "/regles");
    const App = (await import("../src/App.tsx")).default;
    render(<App />);
    await flush();
    expect(screen.getByText("Comment jouer")).toBeTruthy();
  });

  it("l'indice trace le cercle de distance quand la case a un critère Comédie", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-14T10:00:00")); // grille avec geo-loin-comedie
    try {
      const App = (await import("../src/App.tsx")).default;
      const { pool } = await import("../src/data.ts");
      const { generateDaily, seedForDate } = await import("../engine/daily.ts");

      const puzzle = generateDaily(pool, seedForDate("2026-07-14"));
      const cellRules = (ci: number) => [puzzle.rows[Math.floor(ci / 3)]!, puzzle.cols[ci % 3]!];
      const DIST = new Set(["geo-loin-comedie", "geo-proche-comedie"]);
      const cells = [...Array(9).keys()];
      const withRing = cells.find((ci) => cellRules(ci).some((id) => DIST.has(id)))!;
      const withoutRing = cells.find((ci) => !cellRules(ci).some((id) => DIST.has(id)))!;
      expect(withRing).not.toBeUndefined();

      render(<App />);
      await act(async () => fireEvent.click(screen.getByRole("button", { name: /Jouer le défi/ })));

      const openHint = async (ci: number) => {
        await act(async () => fireEvent.click(screen.getAllByText("＋")[ci]!));
        await act(async () => fireEvent.click(screen.getByRole("button", { name: /indice sur le plan/ })));
        await flush();
      };
      const closeHint = async () => {
        await act(async () => fireEvent.click(screen.getByRole("button", { name: /J'ai vu/ })));
        await act(async () => fireEvent.click(screen.getByRole("button", { name: "Fermer" })));
        await flush();
      };

      // Case avec critère de distance : cercle pointillé + libellé du rayon
      await openHint(withRing);
      expect(document.querySelector(".hintmap-canvas circle[stroke-dasharray]")).toBeTruthy();
      expect(screen.getByText(/^(5 km|1,5 km)$/)).toBeTruthy();
      expect(screen.getByText(/à vol d'oiseau autour de la Comédie/)).toBeTruthy();
      await closeHint();

      // Case sans critère de distance : pas de cercle
      await openHint(withoutRing);
      expect(document.querySelector(".hintmap-canvas circle[stroke-dasharray]")).toBeNull();
      expect(screen.queryByText(/^(5 km|1,5 km)$/)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("retirer une station verrouillée coûte un cœur et la rend rejouable", async () => {
    const App = (await import("../src/App.tsx")).default;
    const { pool, byId } = await import("../src/data.ts");
    const { generateDaily, seedForDate } = await import("../engine/daily.ts");
    const { todayStr } = await import("../src/format.ts");

    const puzzle = generateDaily(pool, seedForDate(todayStr()));
    const first = solve(puzzle.valid)[0]!;
    const name = byId.get(first)!.name;

    render(<App />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Jouer le défi/ })));

    // Place une bonne station en case 0…
    await act(async () => fireEvent.click(screen.getAllByText("＋")[0]!));
    const input = screen.getByPlaceholderText(/station/i) as HTMLInputElement;
    await act(async () => fireEvent.change(input, { target: { value: name } }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "OK" })));
    await flush();
    expect(screen.getAllByText("＋").length).toBe(8);

    // … puis la retire via la confirmation : case libre, un cœur en moins.
    await act(async () => fireEvent.click(document.querySelector(".gc.ans.filled") as HTMLElement));
    expect(screen.getByText(/Retirer «/)).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Retirer ·/ })));
    await flush();
    expect(screen.getAllByText("＋").length).toBe(9);
    const hearts = document.querySelector(".hearts")!;
    expect(within(hearts as HTMLElement).getByText("♡")).toBeTruthy();
    const save = JSON.parse(localStorage.getItem(`tamdoku:daily:${todayStr()}`)!);
    expect(save.mistakes).toBe(1);
    expect(save.cells[0]).toBeNull();

    // La station redevient jouable (pas d'avertissement « déjà placée »).
    await act(async () => fireEvent.click(screen.getAllByText("＋")[0]!));
    const input2 = screen.getByPlaceholderText(/station/i) as HTMLInputElement;
    await act(async () => fireEvent.change(input2, { target: { value: name } }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "OK" })));
    await flush();
    expect(screen.queryByText(/déjà placée/)).toBeNull();
    expect(screen.getAllByText("＋").length).toBe(8);
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
