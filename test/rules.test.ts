import { describe, expect, it } from "vitest";
import { loadNetwork } from "../engine/network.ts";
import { buildRules } from "../engine/rules.ts";

const net = loadNetwork();
const rules = buildRules(net);
const rule = (id: string) => {
  const r = rules.find((r) => r.id === id);
  if (!r) throw new Error(`Règle absente : ${id}`);
  return r;
};

describe("catalogue de règles", () => {
  it("compte au moins 35 règles, toutes dans la bande de jouabilité", () => {
    expect(rules.length).toBeGreaterThanOrEqual(35);
    for (const r of rules) {
      expect(r.stationIds.size, r.id).toBeGreaterThanOrEqual(6);
      expect(r.stationIds.size, r.id).toBeLessThanOrEqual(88);
    }
  });

  it("familles toutes représentées", () => {
    const families = new Set(rules.map((r) => r.family));
    expect(families).toEqual(new Set(["ligne", "reseau", "nom", "semantique", "geo"]));
  });

  it("les 5 règles de ligne collent à la desserte", () => {
    expect(rule("ligne-1").stationIds.has("comedie")).toBe(true);
    expect(rule("ligne-3").stationIds.has("comedie")).toBe(false);
    expect(rule("ligne-4").stationIds.has("corum")).toBe(true);
    expect(rule("ligne-5").stationIds.has("gambetta")).toBe(true);
  });

  it("appartenances de référence", () => {
    expect(rule("correspondance").stationIds.has("corum")).toBe(true);
    expect(rule("correspondance").stationIds.has("odysseum")).toBe(false);
    expect(rule("terminus").stationIds.has("mosson")).toBe(true);
    expect(rule("nom-chiffre").stationIds.has("mondial-98")).toBe(true);
    expect(rule("nom-chiffre").stationIds.has("place-du-8-mai-1945")).toBe(true);
    expect(rule("nom-saint").stationIds.has("gare-saint-roch")).toBe(true);
    expect(rule("nom-saint").stationIds.has("comedie")).toBe(false);
    expect(rule("tag-personnalite").stationIds.has("garcia-lorca")).toBe(true);
    expect(rule("geo-hors-montpellier").stationIds.has("jacou")).toBe(true);
    expect(rule("geo-hors-montpellier").stationIds.has("comedie")).toBe(false);
  });

  it("règles lettres : sous-famille dédiée et libellé cohérent", () => {
    const letters = rules.filter((r) => r.subfamily === "contient-lettre");
    expect(letters.length).toBeGreaterThanOrEqual(8);
    for (const r of letters) expect(r.label).toMatch(/^Contient un « [A-Z] »$/);
  });

  it("ids uniques et descriptions non vides", () => {
    expect(new Set(rules.map((r) => r.id)).size).toBe(rules.length);
    for (const r of rules) expect(r.description.length).toBeGreaterThan(20);
  });
});
