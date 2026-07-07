import { mutation } from "./_generated/server";
import { v } from "convex/values";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Enregistre les bonnes réponses d'un joueur pour la grille d'un jour.
 * Endpoint public (via http.ts) → on borne tout et on dédup 1×/jour/joueur ;
 * les réponses fausses ne sont jamais envoyées par le client.
 */
export const submit = mutation({
  args: {
    date: v.string(),
    anon: v.string(),
    cells: v.array(v.object({ cell: v.number(), station: v.string() })),
  },
  handler: async (ctx, { date, anon, cells }) => {
    if (!DATE_RE.test(date) || anon.length < 8 || anon.length > 64) {
      return { ok: false, reason: "bad-args" as const };
    }

    const already = await ctx.db
      .query("submissions")
      .withIndex("by_key", (q) => q.eq("date", date).eq("anon", anon))
      .unique();
    if (already) return { ok: false, reason: "dup" as const };

    await ctx.db.insert("submissions", { date, anon });

    const seen = new Set<number>();
    for (const { cell, station } of cells.slice(0, 9)) {
      if (!Number.isInteger(cell) || cell < 0 || cell > 8 || seen.has(cell)) continue;
      if (!station || station.length > 64) continue;
      seen.add(cell);
      const row = await ctx.db
        .query("counts")
        .withIndex("by_key", (q) => q.eq("date", date).eq("cell", cell).eq("station", station))
        .unique();
      if (row) await ctx.db.patch(row._id, { n: row.n + 1 });
      else await ctx.db.insert("counts", { date, cell, station, n: 1 });
    }
    return { ok: true as const };
  },
});
