import { describe, expect, it } from "vitest";
import { loadNetwork } from "../engine/network.ts";
import { buildRules, restrictRules } from "../engine/rules.ts";

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

describe("catalogue restreint à un sous-réseau (entraînement par ligne)", () => {
  const idsOfLine = (ref: string) =>
    new Set(net.stations.filter((s) => s.lines.includes(ref as never)).map((s) => s.id));

  it("chaque ligne seule offre de quoi bâtir une grille", () => {
    for (const ref of ["1", "2", "3", "4", "5"]) {
      const restricted = restrictRules(rules, idsOfLine(ref));
      expect(restricted.length).toBeGreaterThanOrEqual(12);
      // La règle « Sur la ligne N » est vraie partout : elle sort du catalogue.
      expect(restricted.some((r) => r.id === `ligne-${ref}`)).toBe(false);
    }
  });

  it("ne garde que des stations du périmètre, et des règles discriminantes", () => {
    const ids = idsOfLine("4");
    for (const r of restrictRules(rules, ids)) {
      for (const id of r.stationIds) expect(ids.has(id)).toBe(true);
      expect(r.stationIds.size).toBeGreaterThanOrEqual(3);
      expect(r.stationIds.size).toBeLessThanOrEqual(ids.size - 3);
    }
  });

  it("deux lignes rendent le critère « ligne » de nouveau utile", () => {
    const ids = new Set([...idsOfLine("1"), ...idsOfLine("3")]);
    const lineRules = restrictRules(rules, ids).filter((r) => r.family === "ligne");
    const kept = lineRules.map((r) => r.id);
    // Les deux lignes du périmètre, plus les correspondances (« aussi sur la L2 »).
    expect(kept).toContain("ligne-1");
    expect(kept).toContain("ligne-3");
    // Aucune n'est vraie partout : un critère de ligne y sépare toujours la grille.
    for (const r of lineRules) expect(r.stationIds.size).toBeLessThan(ids.size);
  });
});
