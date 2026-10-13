/**
 * API des statistiques de tamdoku — remplace le déploiement Convex.
 *
 * Mêmes chemins, mêmes formes de réponse, mêmes en-têtes que `convex/http.ts` :
 * la SPA appelle `t-api.my-monkey.fr` en dur et n'a rien à changer.
 *
 * En TypeScript parce que `/grid` recalcule la grille du jour avec le moteur du
 * jeu (`engine/`), écrit en TS et partagé avec la SPA. Le rejouer ici garantit
 * une grille strictement identique à celle du joueur.
 */

import express from "express";
import { grilleDu, libelle, surLaGrille } from "./grille.ts";
import { apercu, appliquerSchema, popularite, reponsesDuJour, soumettre } from "./db.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// La SPA appelle cette API depuis un autre domaine → CORS explicite.
// Autorise tamdoku.fr (+ sous-domaines) et n'importe quel port localhost (dev).
const ORIGINE_OK = /^https:\/\/([a-z0-9-]+\.)?tamdoku\.fr$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

app.use((req, res, next) => {
  const origine = req.headers.origin;
  res.set({
    "Access-Control-Allow-Origin": origine && ORIGINE_OK.test(origine) ? origine : "https://tamdoku.fr",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  });
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

app.post("/submit", async (req, res, next) => {
  try {
    const { date, anon, cells } = req.body ?? {};
    if (typeof date !== "string" || typeof anon !== "string" || !Array.isArray(cells)) {
      return res.status(400).send("bad args");
    }
    if (!DATE_RE.test(date) || anon.length < 8 || anon.length > 64) {
      return res.json({ ok: false, reason: "bad-args" });
    }
    if (!surLaGrille(date, cells)) return res.json({ ok: false, reason: "stale-grid" });
    res.json(await soumettre({ date, anon, cells }));
  } catch (e) {
    next(e);
  }
});

app.get("/popularity", async (req, res, next) => {
  try {
    const date = typeof req.query.date === "string" && DATE_RE.test(req.query.date) ? req.query.date : undefined;
    res.set("Cache-Control", "public, max-age=300").json(await popularite(date));
  } catch (e) {
    next(e);
  }
});

app.get("/overview", async (_req, res, next) => {
  try {
    res.set("Cache-Control", "public, max-age=60").json(await apercu());
  } catch (e) {
    next(e);
  }
});

app.get("/answers", async (req, res, next) => {
  try {
    const date = String(req.query.date ?? "");
    if (!DATE_RE.test(date)) return res.json({ date, cells: [] });
    res.set("Cache-Control", "public, max-age=60").json(await reponsesDuJour(date));
  } catch (e) {
    next(e);
  }
});

app.get("/grid", (req, res) => {
  const date = String(req.query.date ?? "");
  if (!DATE_RE.test(date)) return res.json({ date, rows: [], cols: [] });
  const puzzle = grilleDu(date);
  res.set("Cache-Control", "public, max-age=3600").json({
    date,
    rows: puzzle.rows.map((id) => ({ id, label: libelle(id) })),
    cols: puzzle.cols.map((id) => ({ id, label: libelle(id) })),
  });
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[tamdoku-stats]", err);
  res.status(500).json({ ok: false, reason: "server" });
});

const port = Number(process.env.PORT || 3000);
await appliquerSchema();
app.listen(port, () => console.log(`tamdoku-stats à l'écoute sur :${port}`));
