import { describe, expect, it } from "vitest";
import { loadNetwork } from "../engine/network.ts";
import { buildRules } from "../engine/rules.ts";
import { buildCriteria, terminiPhrase } from "../engine/criteria.ts";
import { generateDaily, seedForDate } from "../engine/daily.ts";
import { fameByStation, originalityPoints } from "../engine/fame.ts";
import { hasPerfectAssignment } from "../engine/matching.ts";

const net = loadNetwork();
const rules = buildRules(net);
const pool = rules; // tout le catalogue alimente la grille du jour
const criteria = buildCriteria(rules);
const ruleById = new Map(rules.map((r) => [r.id, r]));

describe("catalogue de critères", () => {
  it("chaque règle a des métadonnées d'affichage complètes", () => {
    expect(pool.length).toBeGreaterThanOrEqual(40);
    for (const rule of pool) {
      const crit = criteria.get(rule.id);
      expect(crit, rule.id).toBeTruthy();
      expect(crit!.expl.length, rule.id).toBeGreaterThan(15);
      expect(crit!.short.length, rule.id).toBeGreaterThan(0);
    }
  });

  it("aucune explication ne divulgue de station en exemple", () => {
    const stationNames = net.stations.map((s) => s.name);
    for (const rule of pool) {
      const expl = criteria.get(rule.id)!.expl;
      for (const name of stationNames) {
        expect(expl.includes(name), `${rule.id} cite « ${name} »`).toBe(false);
      }
    }
  });

  it("les terminus réels restent exacts (L1 → Gare Sud de France ; L4 → Garcia Lorca)", () => {
    expect(terminiPhrase(net, "1")).toContain("Gare Sud de France");
    expect(terminiPhrase(net, "1")).not.toContain("Odysseum");
    expect(terminiPhrase(net, "4")).toContain("Garcia Lorca");
  });
});

describe("générateur du jour", () => {
  it("est déterministe par date", () => {
    const a = generateDaily(pool, seedForDate("2026-07-10"));
    const b = generateDaily(pool, seedForDate("2026-07-10"));
    expect(a).toEqual(b);
  });

  it("dates différentes → grilles (en général) différentes", () => {
    const seeds = ["2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10"];
    const sigs = seeds.map((d) => {
      const p = generateDaily(pool, seedForDate(d));
      return [...p.rows, ...p.cols].join("|");
    });
    expect(new Set(sigs).size).toBeGreaterThanOrEqual(4);
  });

  it("chaque grille sur 400 jours est valide, solvable et respecte les critères", () => {
    const start = Date.parse("2026-07-06");
    for (let d = 0; d < 400; d++) {
      const date = new Date(start + d * 86_400_000).toISOString().slice(0, 10);
      const p = generateDaily(pool, seedForDate(date));
      expect(new Set([...p.rows, ...p.cols]).size, date).toBe(6);
      expect(p.valid.every((c) => c.length >= 1), date).toBe(true);
      expect(hasPerfectAssignment(p.valid.map((c) => new Set(c))), date).toBe(true);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          for (const sid of p.valid[r * 3 + c]!) {
            expect(ruleById.get(p.rows[r]!)!.stationIds.has(sid)).toBe(true);
            expect(ruleById.get(p.cols[c]!)!.stationIds.has(sid)).toBe(true);
          }
        }
      }
    }
  });

  it("chaque grille est équilibrée : ≥ 1 ligne, ≤ 3 lignes, ≤ 2 lettres, ≤ 2 par autre sous-famille", () => {
    const start = Date.parse("2026-07-06");
    for (let d = 0; d < 200; d++) {
      const date = new Date(start + d * 86_400_000).toISOString().slice(0, 10);
      const p = generateDaily(pool, seedForDate(date));
      const chosen = [...p.rows, ...p.cols].map((id) => ruleById.get(id)!);
      const lines = chosen.filter((r) => r.family === "ligne").length;
      expect(lines, `${date} lignes`).toBeGreaterThanOrEqual(1);
      expect(lines, `${date} lignes`).toBeLessThanOrEqual(3);
      const bySub = new Map<string, number>();
      for (const r of chosen) bySub.set(r.subfamily, (bySub.get(r.subfamily) ?? 0) + 1);
      for (const [sub, n] of bySub) {
        if (sub === "ligne") continue;
        expect(n, `${date} ${sub}`).toBeLessThanOrEqual(2);
      }
    }
  });

  it("« lettre doublée » ne recolle pas les mots", () => {
    const rule = ruleById.get("nom-double-lettre")!;
    for (const junction of ["plan-des-4-seigneurs", "parc-clemenceau", "hopital-lapeyronie", "gare-sud-de-france"]) {
      expect(rule.stationIds.has(junction), junction).toBe(false);
    }
    for (const real of ["mosson", "tonnelles"]) {
      expect(rule.stationIds.has(real), real).toBe(true);
    }
  });

  it("mobilise une large part du catalogue sur un an", () => {
    const start = Date.parse("2026-07-06");
    const used = new Set<string>();
    for (let d = 0; d < 365; d++) {
      const date = new Date(start + d * 86_400_000).toISOString().slice(0, 10);
      const p = generateDaily(pool, seedForDate(date));
      for (const id of [...p.rows, ...p.cols]) used.add(id);
    }
    expect(used.size).toBeGreaterThanOrEqual(rules.length * 0.7);
  });
});

describe("notoriété et score d'originalité", () => {
  it("les correspondances centrales sont plus connues que les stations isolées", () => {
    const fame = fameByStation(net);
    expect(fame.get("comedie")!).toBeGreaterThan(fame.get("estanove")!);
    expect(fame.get("corum")!).toBeGreaterThan(fame.get("astruc")!);
    for (const v of fame.values()) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it("une réponse rare rapporte plus qu'une réponse évidente", () => {
    const fame = fameByStation(net);
    const rare = originalityPoints(fame.get("estanove")!);
    const obvious = originalityPoints(fame.get("comedie")!);
    expect(rare).toBeGreaterThan(obvious);
    expect(originalityPoints(0)).toBeLessThanOrEqual(100);
    expect(originalityPoints(10)).toBeGreaterThanOrEqual(40);
  });
});
