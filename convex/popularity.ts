import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/** Jours de distribution conservés dans le snapshot (archive récente). */
const KEEP_DAYS = 30;

type Cell = { total: number; counts: Record<string, number> };

/** Lu par la SPA au chargement : notoriété globale + distributions d'un jour. */
export const get = query({
  args: { date: v.optional(v.string()) },
  handler: async (ctx, { date }) => {
    const snap = await ctx.db.query("snapshot").first();
    if (!snap) return { updatedAt: 0, stationFame: {}, day: null };
    const days = snap.days as Record<string, Cell[]>;
    return {
      updatedAt: snap.updatedAt as number,
      stationFame: snap.stationFame as Record<string, number>,
      day: date ? (days[date] ?? null) : null,
    };
  },
});

/**
 * Reconstruit le snapshot depuis les compteurs bruts. Appelé par le cron chaque
 * nuit : le jour J joue en fallback fame.ts, la vraie distribution du jour J
 * apparaît dans l'archive à partir de J+1.
 */
export const rebuild = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("counts").collect();

    const stationTotal: Record<string, number> = {};
    for (const r of all) stationTotal[r.station] = (stationTotal[r.station] ?? 0) + r.n;

    const recent = new Set([...new Set(all.map((r) => r.date))].sort().slice(-KEEP_DAYS));
    const days: Record<string, Cell[]> = {};
    for (const r of all) {
      if (!recent.has(r.date)) continue;
      const grid = (days[r.date] ??= Array.from({ length: 9 }, () => ({ total: 0, counts: {} })));
      const cell = grid[r.cell];
      if (!cell) continue;
      cell.counts[r.station] = (cell.counts[r.station] ?? 0) + r.n;
      cell.total += r.n;
    }

    // Notoriété 0..10, log-échelonnée pour que quelques hubs n'écrasent pas tout.
    const max = Math.max(1, ...Object.values(stationTotal));
    const stationFame: Record<string, number> = {};
    for (const [id, tot] of Object.entries(stationTotal)) {
      stationFame[id] = Number(((10 * Math.log1p(tot)) / Math.log1p(max)).toFixed(2));
    }

    const doc = { updatedAt: Date.now(), stationFame, days };
    const prev = await ctx.db.query("snapshot").first();
    if (prev) await ctx.db.replace(prev._id, doc);
    else await ctx.db.insert("snapshot", doc);
  },
});
