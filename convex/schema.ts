import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Stats « qui tape quoi » pour l'originalité réelle (remplace le cold-start
 * heuristique de engine/fame.ts). Alimenté en direct par la SPA, consolidé
 * chaque nuit dans `snapshot` par le cron.
 */
export default defineSchema({
  // Un compteur par (grille du jour, case, station répondue).
  counts: defineTable({
    date: v.string(), // "YYYY-MM-DD" de la grille
    cell: v.number(), // 0..8, row-major
    station: v.string(), // id de station
    n: v.number(),
  })
    .index("by_key", ["date", "cell", "station"])
    .index("by_date", ["date"]),

  // Une ligne par (jour, joueur anonyme) : garantit 1 soumission comptée / jour.
  submissions: defineTable({
    date: v.string(),
    anon: v.string(),
  }).index("by_key", ["date", "anon"]),

  // Singleton reconstruit chaque nuit : prêt à servir tel quel à la SPA.
  snapshot: defineTable({
    updatedAt: v.number(),
    stationFame: v.any(), // Record<stationId, number 0..10> — tri des suggestions + fallback
    days: v.any(), // Record<date, Array<{ total, counts: Record<stationId, n> }>> (9 cases/jour)
  }),
});
