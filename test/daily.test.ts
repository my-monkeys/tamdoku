import { describe, expect, it } from "vitest";
import { loadNetwork } from "../engine/network.ts";
import { networkFor } from "../engine/select.ts";
import { buildRules, poolFor, restrictRules, P_TRAM_FROM } from "../engine/rules.ts";
import { buildCriteria, terminiPhrase } from "../engine/criteria.ts";
import { generateDaily, seedForDate } from "../engine/daily.ts";
import { fameByStation, originalityPoints } from "../engine/fame.ts";
import { hasPerfectAssignment } from "../engine/matching.ts";

const net = loadNetwork();
const rules = buildRules(net);
const pool = rules; // tout le catalogue (l'app tire dans poolFor(rules, date))
const criteria = buildCriteria(rules);
const ruleById = new Map(rules.map((r) => [r.id, r]));

/**
 * Génère exactement comme l'app (cf. src/data.ts) : le catalogue est recompilé
 * sur le **réseau** en vigueur à la date, puis filtré des règles pas encore
 * entrées au tirage. C'est ce double filtrage qui fige les grilles passées quand
 * le réseau s'étend — le tester sur le catalogue complet ne prouverait rien.
 */
const catalogs = new Map<string, ReturnType<typeof buildRules>>();
const catalogFor = (date: string) => {
  const net_ = networkFor(net, date);
  const key = net_.lines.map((l) => l.ref).join("");
  const cached = catalogs.get(key);
  if (cached) return cached;
  const compiled = buildRules(net_);
  catalogs.set(key, compiled);
  return compiled;
};
const dailyFor = (date: string) =>
  generateDaily(poolFor(catalogFor(date), date), seedForDate(date));

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
    const a = dailyFor("2026-07-10");
    const b = dailyFor("2026-07-10");
    expect(a).toEqual(b);
  });

  it("dates différentes → grilles (en général) différentes", () => {
    const seeds = ["2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10"];
    const sigs = seeds.map((d) => {
      const p = dailyFor(d);
      return [...p.rows, ...p.cols].join("|");
    });
    expect(new Set(sigs).size).toBeGreaterThanOrEqual(4);
  });

  it("chaque grille sur 400 jours est valide, solvable et respecte les critères", () => {
    const start = Date.parse("2026-07-06");
    for (let d = 0; d < 400; d++) {
      const date = new Date(start + d * 86_400_000).toISOString().slice(0, 10);
      const p = dailyFor(date);
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
      const p = dailyFor(date);
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
      const p = dailyFor(date);
      for (const id of [...p.rows, ...p.cols]) used.add(id);
    }
    expect(used.size).toBeGreaterThanOrEqual(rules.length * 0.7);
  });
});

describe("bascule datée du catalogue (poolFor)", () => {
  it("p-tram n'entre au tirage qu'à partir de la bascule ; l'entraînement a tout", () => {
    expect(P_TRAM_FROM).toBe("2026-08-02");
    const has = (date: string) => poolFor(rules, date).some((r) => r.id === "p-tram");
    expect(has("2026-08-01")).toBe(false);
    expect(has("2026-08-02")).toBe(true);
    expect(poolFor(rules, "").some((r) => r.id === "p-tram")).toBe(true);
  });

  it("la règle p-tram couvre exactement les stations parkRide", () => {
    const r = ruleById.get("p-tram")!;
    for (const s of net.stations) {
      expect(r.stationIds.has(s.id), s.id).toBe(s.parkRide);
    }
  });

  it("les grilles d'avant bascule restent figées (vérifiées identiques à v0.3.25)", () => {
    const g27 = dailyFor("2026-07-27");
    expect(g27.rows).toEqual(["ligne-3", "ligne-5", "nom-saint"]);
    expect(g27.cols).toEqual(["ligne-1", "tag-personnalite", "geo-hors-montpellier"]);
    const g01 = dailyFor("2026-08-01");
    expect(g01.rows).toEqual(["nom-lettre-b", "ligne-4", "nom-apostrophe"]);
    expect(g01.cols).toEqual(["nom-lettre-t", "ligne-1", "ligne-3"]);
  });

  it("le Bustram n'existe pas avant sa date : ni ligne, ni stations, ni critère", () => {
    const since = net.lines.find((l) => l.ref === "A")!.since!;
    const veille = new Date(Date.parse(since) - 86_400_000).toISOString().slice(0, 10);
    const avant = networkFor(net, veille);
    expect(avant.lines.map((l) => l.ref)).toEqual(["1", "2", "3", "4", "5"]);
    expect(avant.stations).toHaveLength(net.stations.length - 6);
    expect(avant.stations.some((s) => s.id === "verchant")).toBe(false);
    // Les stations partagées restent, amputées du Bustram.
    const sablassou = avant.stations.find((s) => s.id === "notre-dame-de-sablassou")!;
    expect(sablassou.lines).toEqual(["2"]);
    expect(sablassou.terminusOf).toEqual(["2"]);
    expect(catalogFor(veille).some((r) => r.id === "ligne-A")).toBe(false);
    expect(catalogFor(since).some((r) => r.id === "ligne-A")).toBe(true);
    expect(networkFor(net, "").lines).toHaveLength(6); // entraînement : tout le réseau
  });

  it("aucune grille d'avant la bascule ne propose une station du Bustram", () => {
    const since = net.lines.find((l) => l.ref === "A")!.since!;
    const propres = new Set(
      net.stations.filter((s) => s.lines.length === 1 && s.lines[0] === "A").map((s) => s.id),
    );
    for (let d = 0; d < 120; d++) {
      const date = new Date(Date.parse("2026-07-01") + d * 86_400_000).toISOString().slice(0, 10);
      if (date >= since) break;
      for (const cell of dailyFor(date).valid) {
        for (const id of cell) expect(propres.has(id), `${date} : ${id}`).toBe(false);
      }
    }
  });

  it("le Bustram entre bien au tirage une fois sa date passée", () => {
    const since = net.lines.find((l) => l.ref === "A")!.since!;
    const start = Date.parse(since);
    let found = false;
    for (let d = 0; d < 120 && !found; d++) {
      const date = new Date(start + d * 86_400_000).toISOString().slice(0, 10);
      const p = dailyFor(date);
      found = [...p.rows, ...p.cols].includes("ligne-A");
    }
    expect(found).toBe(true);
  });

  it("p-tram est réellement tirée dans les grilles d'après-bascule", () => {
    const start = Date.parse(P_TRAM_FROM);
    let found = false;
    for (let d = 0; d < 60 && !found; d++) {
      const date = new Date(start + d * 86_400_000).toISOString().slice(0, 10);
      const p = dailyFor(date);
      found = [...p.rows, ...p.cols].includes("p-tram");
    }
    expect(found).toBe(true);
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

describe("grilles d'entraînement restreintes à une ligne", () => {
  const lines = ["1", "2", "3", "4", "5"] as const;

  it("chaque ligne produit des grilles valides et solvables", () => {
    for (const ref of lines) {
      const ids = new Set(net.stations.filter((s) => s.lines.includes(ref)).map((s) => s.id));
      const restricted = restrictRules(rules, ids);
      for (let k = 0; k < 20; k++) {
        const puzzle = generateDaily(restricted, (k * 7919 + 13) >>> 0, { lineRules: 0 });
        expect(puzzle.valid.every((cell) => cell.length > 0)).toBe(true);
        expect(hasPerfectAssignment(puzzle.valid.map((c) => new Set(c)))).toBe(true);
        // Le périmètre est étanche : aucune solution hors de la ligne.
        for (const cell of puzzle.valid) for (const id of cell) expect(ids.has(id)).toBe(true);
        // Et aucun critère « Sur la ligne N », qui n'apprendrait rien ici.
        for (const id of [...puzzle.rows, ...puzzle.cols]) expect(id.startsWith("ligne-")).toBe(false);
      }
    }
  });

  it("le Bustram seul ne compose pas de grille, mais s'associe à n'importe quelle ligne", () => {
    const idsOf = (refs: string[]) =>
      new Set(net.stations.filter((s) => s.lines.some((r) => refs.includes(r))).map((s) => s.id));
    // 8 stations pour 9 cases distinctes : mathématiquement impossible. C'est ce
    // que le garde-fou de l'écran d'entraînement empêche de tenter.
    expect(idsOf(["A"]).size).toBeLessThan(9);
    expect(() =>
      generateDaily(restrictRules(rules, idsOf(["A"])), 42, { lineRules: 0 }),
    ).toThrow();
    for (const other of lines) {
      const restricted = restrictRules(rules, idsOf(["A", other]));
      const puzzle = generateDaily(restricted, 42, { lineRules: 1 });
      expect(puzzle.valid.every((cell) => cell.length > 0)).toBe(true);
    }
  });

  it("l'option lineRules ne touche pas le tirage du défi du jour", () => {
    for (const date of ["2026-07-06", "2026-08-02", "2026-08-20"]) {
      const withOption = generateDaily(poolFor(rules, date), seedForDate(date), {});
      const asShipped = generateDaily(poolFor(rules, date), seedForDate(date));
      expect(withOption).toEqual(asShipped);
    }
  });
});
