import { describe, expect, it } from "vitest";
import { grilleDu, surLaGrille } from "../server/src/grille.ts";

describe("/submit : réponses vérifiées sur la grille de la date", () => {
  const date = "2026-10-12";

  it("accepte les bonnes réponses de la grille du jour", () => {
    const { valid } = grilleDu(date);
    const cells = valid.map((stations, cell) => ({ cell, station: stations[0]! }));
    expect(surLaGrille(date, cells)).toBe(true);
  });

  it("écarte l'envoi d'un client resté sur la grille d'avant le Bustram A", () => {
    // Juste sur l'ancienne grille (P+Tram × L4), ni un seul mot ni de H sur la vraie.
    expect(surLaGrille(date, [{ cell: 0, station: "garcia-lorca" }])).toBe(false);
  });

  it("écarte une case hors grille ou mal formée", () => {
    const station = grilleDu(date).valid[0]![0]!;
    expect(surLaGrille(date, [{ cell: 9, station }])).toBe(false);
    expect(surLaGrille(date, [{ cell: "0", station }])).toBe(false);
    expect(surLaGrille(date, [null])).toBe(false);
  });
});
