import { describe, expect, it } from "vitest";
import { loadNetwork, stationById } from "../engine/network.ts";
import type { LineRef } from "../engine/types.ts";

const net = loadNetwork();
const byId = stationById(net);
const lines = (id: string): LineRef[] => byId.get(id)!.lines;

describe("network.json — invariants du réseau TaM", () => {
  it("a 5 lignes et un nombre plausible de stations", () => {
    expect(net.lines.map((l) => l.ref)).toEqual(["1", "2", "3", "4", "5"]);
    expect(net.stations.length).toBeGreaterThanOrEqual(100);
    expect(net.stations.length).toBeLessThanOrEqual(120);
  });

  it("ids uniques, chaque station a lignes, commune et coordonnées", () => {
    const ids = new Set(net.stations.map((s) => s.id));
    expect(ids.size).toBe(net.stations.length);
    for (const s of net.stations) {
      expect(s.lines.length).toBeGreaterThan(0);
      expect(s.commune).toBeTruthy();
      expect(s.lat).toBeGreaterThan(43.5);
      expect(s.lat).toBeLessThan(43.8);
    }
  });

  it("dessertes de référence (correspondances réelles)", () => {
    expect(lines("comedie")).toEqual(["1", "2"]);
    expect(lines("corum")).toEqual(["1", "2", "4"]);
    expect(lines("gambetta")).toEqual(["3", "5"]);
    expect(lines("gare-saint-roch")).toEqual(["1", "2"]);
    expect(lines("gare-saint-roch-republique")).toEqual(["3", "4"]);
    expect(lines("albert-1er-saint-charles")).toEqual(["1", "5"]);
    expect(lines("albert-1er-jardin-des-plantes")).toEqual(["4", "5"]);
    expect(lines("mosson")).toEqual(["1", "3"]);
  });

  it("les quais directionnels de Gambetta sont fusionnés en alias", () => {
    const gambetta = byId.get("gambetta")!;
    expect(gambetta.aliases).toContain("Gambetta - Chaptal");
    expect(gambetta.aliases).toContain("Gambetta - Saint-Denis");
    expect(byId.has("gambetta-chaptal")).toBe(false);
  });

  it("terminus corrects, ligne 4 circulaire sans terminus", () => {
    const l1 = net.lines.find((l) => l.ref === "1")!;
    expect(l1.termini.sort()).toEqual(["gare-sud-de-france", "mosson"]);
    const l3 = net.lines.find((l) => l.ref === "3")!;
    expect(l3.termini).toContain("lattes-centre");
    expect(l3.termini).toContain("perols-etang-de-l-or");
    const l4 = net.lines.find((l) => l.ref === "4")!;
    expect(l4.circular).toBe(true);
    expect(l4.termini).toEqual([]);
    expect(byId.get("jacou")!.terminusOf).toEqual(["2"]);
  });

  it("préfixes ambigus jamais en alias", () => {
    for (const s of net.stations) {
      expect(s.aliases).not.toContain("Albert 1er");
      expect(s.aliases).not.toContain("Gare Saint-Roch");
      expect(s.aliases).not.toContain("Pérols");
      expect(s.aliases).not.toContain("Rives du Lez");
    }
  });

  it("communes hors Montpellier présentes (extension L5 comprise)", () => {
    const communes = new Set(net.stations.map((s) => s.commune));
    for (const attendue of [
      "Montpellier",
      "Castelnau-le-Lez",
      "Lattes",
      "Pérols",
      "Jacou",
      "Clapiers",
      "Montferrier-sur-Lez",
      "Juvignac",
      "Saint-Jean-de-Védas",
    ]) {
      expect(communes).toContain(attendue);
    }
  });
});
