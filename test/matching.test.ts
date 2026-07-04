import { describe, expect, it } from "vitest";
import { hasPerfectAssignment, maxAssignment, revealGrid } from "../engine/matching.ts";

const sets = (...arrays: string[][]) => arrays.map((a) => new Set(a));

describe("matching biparti", () => {
  it("affectation parfaite possible", () => {
    expect(hasPerfectAssignment(sets(["a", "b"], ["b", "c"], ["c", "a"]))).toBe(true);
  });

  it("détecte l'impossibilité (3 cases, 2 stations)", () => {
    expect(hasPerfectAssignment(sets(["a", "b"], ["a", "b"], ["a", "b"]))).toBe(false);
    expect(maxAssignment(sets(["a", "b"], ["a", "b"], ["a", "b"]))).toBe(2);
  });

  it("cas de réaffectation en chaîne", () => {
    // La case 3 n'a que « a » : les cases 1 et 2 doivent se réorganiser.
    expect(hasPerfectAssignment(sets(["a", "b"], ["a", "c"], ["a"]))).toBe(true);
  });

  it("case vide → pas d'affectation", () => {
    expect(hasPerfectAssignment(sets(["a"], []))).toBe(false);
  });
});

describe("revealGrid", () => {
  it("garde les placements et complète avec la 1re station valide libre, distincte", () => {
    const r = revealGrid(sets(["a", "b"], ["b", "c"], ["a", "c"]), ["a", null, null]);
    expect(r[0]).toBe("a"); // placement du joueur conservé
    expect(r[1]).toBe("b"); // 1re libre (a déjà pris)
    expect(r[2]).toBe("c"); // a et b pris → c
    expect(new Set(r).size).toBe(3);
  });

  it("laisse null quand aucune station libre ne reste pour une case", () => {
    const r = revealGrid(sets(["a"], ["a"]), [null, null]);
    expect(r[0]).toBe("a");
    expect(r[1]).toBeNull();
  });
});
