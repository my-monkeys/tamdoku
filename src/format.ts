/** Dates, grille d'emojis de partage, texte de partage. */
import { byId } from "./data.ts";

const pad2 = (x: number) => String(x).padStart(2, "0");

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function yesterdayStr(): string {
  const d = new Date(Date.now() - 86_400_000);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** JJ/MM pour l'affichage. */
export function prettyDate(iso?: string): string {
  const parts = (iso ?? todayStr()).split("-");
  return `${parts[2]}/${parts[1]}`;
}

/** Date longue française (ex. « sam. 5 juil. »), pour l'archive. */
export function prettyDateLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d!, 12).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

const LINE_EMOJI: Record<number, string> = { 1: "🟦", 2: "🟧", 3: "🟩", 4: "🟨", 5: "🟪" };

/** 1re ligne de tram de chaque case (null = vide) — la teinte de la case au résultat. */
export function linesGrid(cells: (string | null)[]): (number | null)[] {
  return cells.map((id) => {
    const first = id ? byId.get(id)?.lines[0] : undefined;
    return first ? Number(first) : null;
  });
}

/** Vieux résultats sans `lines` : on retrouve la ligne depuis l'emoji de partage. */
export function linesFromEmoji(rows: string[]): (number | null)[] {
  const byEmoji = new Map(Object.entries(LINE_EMOJI).map(([n, e]) => [e, Number(n)]));
  const out: (number | null)[] = [];
  for (const row of rows) for (const glyph of [...row]) out.push(byEmoji.get(glyph) ?? null);
  while (out.length < 9) out.push(null);
  return out.slice(0, 9);
}

/** Trois lignes d'emojis : couleur de la 1re ligne de chaque station placée, ⬛ si vide. */
export function emojiGrid(cells: (string | null)[]): string[] {
  const rows: string[] = [];
  for (let r = 0; r < 3; r++) {
    let line = "";
    for (let c = 0; c < 3; c++) {
      const id = cells[r * 3 + c];
      const station = id ? byId.get(id) : undefined;
      const first = station?.lines[0];
      line += first ? (LINE_EMOJI[Number(first)] ?? "⬛") : "⬛";
    }
    rows.push(line);
  }
  return rows;
}

function shareMeta(game: "daily" | "practice" | "archive", date?: string): { head: string; url: string } {
  const head =
    game === "daily"
      ? `Tamdoku ${prettyDate()}`
      : game === "archive"
        ? `Tamdoku · ${prettyDate(date)}`
        : "Tamdoku · Entraînement";
  const url = game === "archive" && date ? `tamdoku.fr/archive/${date}` : "tamdoku.fr";
  return { head, url };
}

/** Texte court qui accompagne la carte de partage image (la grille est sur l'image). */
export function shareCaption(
  game: "daily" | "practice" | "archive",
  result: { score: number },
  date?: string,
): string {
  const { head, url } = shareMeta(game, date);
  return `🚋 ${head} — ${result.score}/900 · ${url}`;
}

export function shareText(
  game: "daily" | "practice" | "archive",
  result: { score: number; solved: number; mistakes: number; rare: string; emoji: string[] },
  date?: string,
): string {
  const { head, url } = shareMeta(game, date);
  return [
    `🚋 ${head}`,
    `${result.score}/900 · ${result.solved}/9 cases · ${result.mistakes} ❌`,
    result.emoji.join("\n"),
    `Rare : ${result.rare}`,
    url,
  ].join("\n");
}
