import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Distribution des réponses par case pour un jour, calculée en direct sur les
 * compteurs (contrairement à popularity.get qui lit le snapshot nocturne).
 * Utilisé par le drill-down du dashboard : voir qui a répondu quoi, case par case.
 */
export const byDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const rows = await ctx.db
      .query("counts")
      .withIndex("by_date", (q) => q.eq("date", date))
      .collect();

    const cells = Array.from({ length: 9 }, () => ({
      total: 0,
      answers: [] as { station: string; n: number }[],
    }));
    const acc = Array.from({ length: 9 }, () => new Map<string, number>());
    for (const r of rows) {
      const m = acc[r.cell];
      if (!m) continue;
      m.set(r.station, (m.get(r.station) ?? 0) + r.n);
    }
    acc.forEach((m, i) => {
      const cell = cells[i]!;
      cell.answers = [...m.entries()]
        .map(([station, n]) => ({ station, n }))
        .sort((a, b) => b.n - a.n);
      cell.total = cell.answers.reduce((s, a) => s + a.n, 0);
    });

    return { date, cells };
  },
});
