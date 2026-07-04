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

const LINE_EMOJI: Record<number, string> = { 1: "🟦", 2: "🟧", 3: "🟩", 4: "🟨", 5: "🟪" };

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

export function shareText(
  game: "daily" | "practice",
  result: { score: number; solved: number; mistakes: number; rare: string; emoji: string[] },
): string {
  const head = game === "daily" ? `Tamdoku ${prettyDate()}` : "Tamdoku · Entraînement";
  return [
    `🚋 ${head}`,
    `${result.score}/900 · ${result.solved}/9 cases · ${result.mistakes} ❌`,
    result.emoji.join("\n"),
    `Rare : ${result.rare}`,
    "tamdoku.my-monkey.fr",
  ].join("\n");
}
