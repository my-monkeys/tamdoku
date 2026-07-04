import { describe, expect, it } from "vitest";
import { loadNetwork, stationById } from "../engine/network.ts";
import { buildRules } from "../engine/rules.ts";
import { buildCriteria, dailyPool, terminiPhrase } from "../engine/criteria.ts";
import { generateDaily, seedForDate } from "../engine/daily.ts";
import { fameByStation, originalityPoints } from "../engine/fame.ts";
import { hasPerfectAssignment } from "../engine/matching.ts";

const net = loadNetwork();
const rules = buildRules(net);
const pool = dailyPool(rules);
const criteria = buildCriteria();
const byId = stationById(net);

describe("pool quotidien + critères", () => {
  it("les 9 critères existent et sont mappés à de vraies règles", () => {
    expect(pool).toHaveLength(9);
    for (const rule of pool) {
      const crit = criteria.get(rule.id);
      expect(crit, rule.id).toBeTruthy();
      expect(crit!.expl.length).toBeGreaterThan(20);
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

  it("les terminus réels restent exacts (L1 → Gare Sud de France, pas Odysseum)", () => {
    expect(terminiPhrase(net, "1")).toContain("Gare Sud de France");
    expect(terminiPhrase(net, "1")).not.toContain("Odysseum");
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
      // chaque solution satisfait réellement la règle de sa ligne et de sa colonne
      const rule = (id: string) => rules.find((r) => r.id === id)!;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          for (const sid of p.valid[r * 3 + c]!) {
            expect(rule(p.rows[r]!).stationIds.has(sid)).toBe(true);
            expect(rule(p.cols[c]!).stationIds.has(sid)).toBe(true);
          }
        }
      }
    }
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
