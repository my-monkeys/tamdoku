/**
 * Accès aux statistiques, sur PostgreSQL.
 *
 * Remplace les fonctions Convex du dossier `convex/`. Le snapshot nocturne a
 * disparu : il servait à ne PAS exposer la distribution du jour en cours aux
 * joueurs de ce jour — reconstruit à 2h30, il ne contenait que l'histoire
 * jusqu'à la veille. La condition `date < CURRENT_DATE` donne la même garantie,
 * en mieux : plus de cron, et jamais de données périmées si le cron saute.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ici = dirname(fileURLToPath(import.meta.url));

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 8,
});

export async function appliquerSchema() {
  await pool.query(readFileSync(join(ici, "..", "schema.sql"), "utf8"));
}

/**
 * Enregistre les bonnes réponses d'un joueur pour la grille d'un jour.
 *
 * Endpoint public : on borne tout et on dédoublonne une fois par jour et par
 * joueur. Les réponses fausses ne sont jamais envoyées par le client.
 */
export async function soumettre({ date, anon, cells }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ON CONFLICT DO NOTHING : le doublon se détecte à l'insertion plutôt que
    // par un SELECT préalable, ce qui reste juste si deux requêtes arrivent
    // en même temps.
    const pose = await client.query(
      "INSERT INTO submissions (date, anon) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING 1",
      [date, anon],
    );
    if (pose.rowCount === 0) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "dup" };
    }

    const vues = new Set();
    // Stations dont ce joueur est le tout premier à les donner sur cette case :
    // le client en fait un bonus « pionnier ».
    const firsts = [];
    for (const { cell, station } of cells.slice(0, 9)) {
      if (!Number.isInteger(cell) || cell < 0 || cell > 8 || vues.has(cell)) continue;
      if (!station || typeof station !== "string" || station.length > 64) continue;
      vues.add(cell);
      const r = await client.query(
        `INSERT INTO counts (date, cell, station, n) VALUES ($1, $2, $3, 1)
         ON CONFLICT (date, cell, station) DO UPDATE SET n = counts.n + 1
         RETURNING (xmax = 0) AS cree`,
        [date, cell, station],
      );
      if (r.rows[0]?.cree) firsts.push({ cell, station });
    }

    await client.query("COMMIT");
    return { ok: true, firsts };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Notoriété globale des stations + distribution d'un jour passé.
 *
 * `date < CURRENT_DATE` partout : la grille du jour ne doit rien révéler aux
 * joueurs qui y sont encore.
 */
export async function popularite(date) {
  const { rows: totaux } = await pool.query(
    "SELECT station, SUM(n)::int AS total FROM counts WHERE date < CURRENT_DATE GROUP BY station",
  );

  // Notoriété 0..10, log-échelonnée pour que quelques hubs n'écrasent pas tout.
  const max = Math.max(1, ...totaux.map((r) => r.total));
  const stationFame = {};
  for (const { station, total } of totaux) {
    stationFame[station] = Number(((10 * Math.log1p(total)) / Math.log1p(max)).toFixed(2));
  }

  let day = null;
  if (date) {
    const { rows } = await pool.query(
      "SELECT cell, station, n FROM counts WHERE date = $1 AND date < CURRENT_DATE",
      [date],
    );
    if (rows.length) {
      day = Array.from({ length: 9 }, () => ({ total: 0, counts: {} }));
      for (const { cell, station, n } of rows) {
        const c = day[cell];
        if (!c) continue;
        c.counts[station] = (c.counts[station] ?? 0) + n;
        c.total += n;
      }
    }
  }

  return { updatedAt: Date.now(), stationFame, day };
}

/** Agrégats pour le tableau de bord ops. */
export async function apercu() {
  const [jours, stations, totaux] = await Promise.all([
    pool.query(`
      SELECT to_char(d.date, 'YYYY-MM-DD') AS date,
             COALESCE(s.players, 0)::int   AS players,
             COALESCE(c.answers, 0)::int   AS answers
        FROM (SELECT date FROM counts UNION SELECT date FROM submissions) d
        LEFT JOIN (SELECT date, COUNT(*) players FROM submissions GROUP BY date) s USING (date)
        LEFT JOIN (SELECT date, SUM(n) answers FROM counts GROUP BY date) c USING (date)
       ORDER BY d.date`),
    pool.query("SELECT station, SUM(n)::int AS n FROM counts GROUP BY station ORDER BY n DESC LIMIT 15"),
    pool.query(`SELECT (SELECT COUNT(DISTINCT date) FROM counts)::int      AS "distinctDays",
                       (SELECT COUNT(DISTINCT station) FROM counts)::int   AS "distinctStations",
                       (SELECT COALESCE(SUM(n), 0) FROM counts)::int       AS "totalAnswers",
                       (SELECT COUNT(*) FROM submissions)::int             AS "totalPlayers"`),
  ]);

  return {
    days: jours.rows,
    topStations: stations.rows,
    ...totaux.rows[0],
    updatedAt: Date.now(),
  };
}

/** Distribution des réponses par case pour un jour — vue ops, sans restriction de date. */
export async function reponsesDuJour(date) {
  const { rows } = await pool.query(
    // station en second critère : sans lui, l'ordre des ex æquo change d'un
    // appel à l'autre et le tableau de bord semble bouger tout seul.
    "SELECT cell, station, n FROM counts WHERE date = $1 ORDER BY n DESC, station",
    [date],
  );
  const cells = Array.from({ length: 9 }, () => ({ total: 0, answers: [] }));
  for (const { cell, station, n } of rows) {
    const c = cells[cell];
    if (!c) continue;
    c.answers.push({ station, n });
    c.total += n;
  }
  return { date, cells };
}
