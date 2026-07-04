import { describe, expect, it } from "vitest";
import { parsePath, pathFor } from "../src/routes.ts";

describe("routes — URL ↔ écran", () => {
  it("parsePath", () => {
    expect(parsePath("/")).toEqual({ name: "home" });
    expect(parsePath("/archive")).toEqual({ name: "archive" });
    expect(parsePath("/archive/")).toEqual({ name: "archive" });
    expect(parsePath("/regles")).toEqual({ name: "rules" });
    expect(parsePath("/stats")).toEqual({ name: "stats" });
    expect(parsePath("/a-propos")).toEqual({ name: "about" });
    expect(parsePath("/archive/2026-07-03")).toEqual({ name: "grid", date: "2026-07-03" });
    expect(parsePath("/nimportequoi")).toEqual({ name: "home" });
  });

  it("pathFor : le jeu du jour reste sur /, l'archive a une vraie URL", () => {
    expect(pathFor("home", "daily", "2026-07-05")).toBe("/");
    expect(pathFor("game", "daily", "2026-07-05")).toBe("/");
    expect(pathFor("game", "practice", "")).toBe("/");
    expect(pathFor("game", "archive", "2026-07-03")).toBe("/archive/2026-07-03");
    expect(pathFor("archive", "daily", "")).toBe("/archive");
    expect(pathFor("rules", "daily", "")).toBe("/regles");
    expect(pathFor("about", "daily", "")).toBe("/a-propos");
  });

  it("aller-retour parsePath ∘ pathFor pour une grille passée", () => {
    expect(parsePath(pathFor("game", "archive", "2026-07-02"))).toEqual({
      name: "grid",
      date: "2026-07-02",
    });
  });
});
