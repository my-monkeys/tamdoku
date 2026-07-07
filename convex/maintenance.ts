import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Purge des données d'un jour (démo, test, ou abus). Outil admin — non exposé en
 * HTTP, s'exécute via `npx convex run maintenance:clearDate '{"date":"..."}'`.
 */
export const clearDate = internalMutation({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const counts = await ctx.db
      .query("counts")
      .withIndex("by_date", (q) => q.eq("date", date))
      .collect();
    for (const c of counts) await ctx.db.delete(c._id);

    const subs = await ctx.db
      .query("submissions")
      .withIndex("by_key", (q) => q.eq("date", date))
      .collect();
    for (const s of subs) await ctx.db.delete(s._id);

    return { date, removedCounts: counts.length, removedSubmissions: subs.length };
  },
});
