import { describe, expect, it } from "vitest";
import { hasPerfectAssignment, maxAssignment } from "../engine/matching.ts";

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
