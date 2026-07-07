import { query } from "./_generated/server";

/**
 * Agrégats prêts pour le dashboard ops (monkey /outils/data). Scan direct des
 * compteurs — le volume reste petit (1 ligne / case-station-jour).
 */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const counts = await ctx.db.query("counts").collect();
    const subs = await ctx.db.query("submissions").collect();
    const snap = await ctx.db.query("snapshot").first();

    // Par jour : joueurs (soumissions) + réponses (somme des compteurs).
    const perDay = new Map<string, { players: number; answers: number }>();
    const bump = (date: string) => perDay.get(date) ?? { players: 0, answers: 0 };
    for (const s of subs) {
      const d = bump(s.date);
      d.players += 1;
      perDay.set(s.date, d);
    }
    for (const c of counts) {
      const d = bump(c.date);
      d.answers += c.n;
      perDay.set(c.date, d);
    }
    const days = [...perDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));

    // Stations les plus données (toutes cases / jours confondus).
    const perStation = new Map<string, number>();
    for (const c of counts) perStation.set(c.station, (perStation.get(c.station) ?? 0) + c.n);
    const topStations = [...perStation.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([station, n]) => ({ station, n }));

    return {
      updatedAt: (snap?.updatedAt as number) ?? 0,
      totalPlayers: subs.length,
      totalAnswers: counts.reduce((sum, c) => sum + c.n, 0),
      distinctStations: perStation.size,
      distinctDays: perDay.size,
      days,
      topStations,
    };
  },
});
