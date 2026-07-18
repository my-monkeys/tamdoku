/**
 * Carte de partage : un PNG 1080×1350 rendu en canvas aux couleurs de l'app
 * (remplace la grille d'emojis, illisible hors contexte). Rendue en avance dès
 * l'écran de résultat pour que navigator.share reste dans le geste utilisateur.
 */

export interface ShareCardData {
  /** « Défi du 18/07 », « Grille du 05/07 » ou « Entraînement ». */
  title: string;
  /** « Grille nº 18 » — vide pour l'entraînement. */
  subtitle: string;
  /** 1re ligne de tram de chaque case (null = case restée vide). */
  lines: (number | null)[];
  score: number;
  stars: number;
  solved: number;
  mistakes: number;
  rare: string;
  won: boolean;
  /** Nom du fichier téléchargé sur desktop ; défaut « tamdoku.png ». */
  filename?: string;
}

const LINE_COLORS: Record<number, string> = {
  1: "#0059A2",
  2: "#EF7D00",
  3: "#C6D302",
  4: "#4C2B0E",
  5: "#287530",
};
const PAPER = "#F4F1E9";
const CARD = "#FFFFFF";
const INK = "#17181C";
const MUTED = "#7E7C72";
const LINE = "#E4DFD2";
const SOFT = "#EDE9DD";
const STAR = "#F4B223";

const W = 1080;
const H = 1350;

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function renderShareCard(d: ShareCardData): Promise<File> {
  // Les fonts de la page sont déjà téléchargées : load() ne fait que garantir
  // qu'elles sont prêtes pour le canvas.
  await Promise.all([
    document.fonts.load("900 104px Archivo"),
    document.fonts.load("800 120px Archivo"),
    document.fonts.load('600 34px "Hanken Grotesk"'),
    document.fonts.load('700 34px "Hanken Grotesk"'),
  ]).catch(() => {});

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d indisponible");

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // ── En-tête ────────────────────────────────────────────────────────────────
  ctx.fillStyle = INK;
  ctx.font = "900 104px Archivo, sans-serif";
  ctx.fillText("TAMDOKU", W / 2, 158);
  ctx.fillStyle = MUTED;
  ctx.font = '700 36px "Hanken Grotesk", sans-serif';
  ctx.fillText(d.subtitle ? `${d.title} · ${d.subtitle}` : d.title, W / 2, 222);

  // ── Carte blanche ──────────────────────────────────────────────────────────
  const cardX = 90;
  const cardY = 270;
  const cardW = W - cardX * 2;
  const cardH = 850;
  ctx.save();
  ctx.shadowColor = "rgba(23,24,28,.16)";
  ctx.shadowBlur = 46;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = CARD;
  rr(ctx, cardX, cardY, cardW, cardH, 46);
  ctx.fill();
  ctx.restore();

  // Grille 3×3 : la teinte de la 1re ligne de chaque station, case vide en creux.
  const cell = 148;
  const gap = 16;
  const gridW = cell * 3 + gap * 2;
  const gx = (W - gridW) / 2;
  const gy = cardY + 52;
  for (let i = 0; i < 9; i++) {
    const x = gx + (i % 3) * (cell + gap);
    const y = gy + Math.floor(i / 3) * (cell + gap);
    const n = d.lines[i];
    if (n && LINE_COLORS[n]) {
      ctx.fillStyle = LINE_COLORS[n];
      rr(ctx, x, y, cell, cell, 26);
      ctx.fill();
    } else {
      ctx.fillStyle = SOFT;
      rr(ctx, x, y, cell, cell, 26);
      ctx.fill();
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      rr(ctx, x + 4, y + 4, cell - 8, cell - 8, 22);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Score.
  const scoreY = gy + cell * 3 + gap * 2 + 122;
  ctx.fillStyle = INK;
  ctx.font = "900 120px Archivo, sans-serif";
  const scoreTxt = String(d.score);
  const scoreW = ctx.measureText(scoreTxt).width;
  ctx.font = '700 44px "Hanken Grotesk", sans-serif';
  const maxW = ctx.measureText("/900").width;
  const startX = (W - scoreW - maxW - 10) / 2;
  ctx.textAlign = "left";
  ctx.font = "900 120px Archivo, sans-serif";
  ctx.fillText(scoreTxt, startX, scoreY);
  ctx.fillStyle = MUTED;
  ctx.font = '700 44px "Hanken Grotesk", sans-serif';
  ctx.fillText("/900", startX + scoreW + 10, scoreY);
  ctx.textAlign = "center";
  ctx.fillStyle = MUTED;
  ctx.font = '700 27px "Hanken Grotesk", sans-serif';
  ctx.fillText("POINTS D'ORIGINALITÉ", W / 2, scoreY + 46);

  // Étoiles + cases/erreurs.
  ctx.font = "44px system-ui, sans-serif";
  const starGap = 58;
  for (let k = 0; k < 3; k++) {
    ctx.fillStyle = k < d.stars ? STAR : LINE;
    ctx.fillText("★", W / 2 + (k - 1) * starGap, scoreY + 104);
  }
  ctx.fillStyle = INK;
  ctx.font = '600 33px "Hanken Grotesk", sans-serif';
  ctx.fillText(`${d.solved}/9 cases · ${d.mistakes} erreur${d.mistakes > 1 ? "s" : ""}`, W / 2, scoreY + 162);

  // ── Sous la carte : station la plus rare + légende + lien ─────────────────
  const rareLabel = "Station la plus rare : ";
  ctx.font = '600 32px "Hanken Grotesk", sans-serif';
  const rareLabelW = ctx.measureText(rareLabel).width;
  ctx.font = '800 36px "Hanken Grotesk", sans-serif';
  const rareNameW = ctx.measureText(d.rare).width;
  const rareX = (W - rareLabelW - rareNameW) / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = MUTED;
  ctx.font = '600 32px "Hanken Grotesk", sans-serif';
  ctx.fillText(rareLabel, rareX, cardY + cardH + 56);
  ctx.fillStyle = INK;
  ctx.font = '800 36px "Hanken Grotesk", sans-serif';
  ctx.fillText(d.rare, rareX + rareLabelW, cardY + cardH + 56);
  ctx.textAlign = "center";

  const legendY = cardY + cardH + 126;
  const dot = 40;
  const dotGap = 12;
  ctx.font = '700 24px "Hanken Grotesk", sans-serif';
  const capTxt = "= les lignes de tram";
  const capW = ctx.measureText(capTxt).width;
  const legendW = 5 * dot + 4 * dotGap + 14 + capW;
  let lx = (W - legendW) / 2;
  for (let n = 1; n <= 5; n++) {
    ctx.fillStyle = LINE_COLORS[n]!;
    rr(ctx, lx, legendY - dot + 8, dot, dot, 12);
    ctx.fill();
    ctx.fillStyle = n === 3 ? INK : "#FFFFFF";
    ctx.font = "800 22px Archivo, sans-serif";
    ctx.fillText(String(n), lx + dot / 2, legendY - 5);
    lx += dot + dotGap;
  }
  ctx.textAlign = "left";
  ctx.fillStyle = MUTED;
  ctx.font = '700 24px "Hanken Grotesk", sans-serif';
  ctx.fillText(capTxt, lx + 14, legendY - 6);
  ctx.textAlign = "center";

  ctx.fillStyle = INK;
  ctx.font = "800 40px Archivo, sans-serif";
  ctx.fillText("tamdoku.fr", W / 2, H - 32);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("toBlob indisponible");
  return new File([blob], d.filename ?? "tamdoku.png", { type: "image/png" });
}
