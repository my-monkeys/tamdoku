import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// « Tous les soirs on met à jour le site » : consolide les compteurs de la
// veille. 02:30 UTC ≈ 04:30 Paris (heure d'été) — après le rollover de minuit.
crons.daily(
  "rebuild popularity snapshot",
  { hourUTC: 2, minuteUTC: 30 },
  internal.popularity.rebuild,
);

export default crons;
