import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { track } from "./analytics.ts";
import { linesFromEmoji, prettyDate, shareCaption, shareText } from "./format.ts";
import { renderShareCard } from "./shareCard.ts";
import { puzzleNumber, useGame } from "./useGame.ts";
import { Home } from "./components/Home.tsx";
import { Game, UnlockConfirm } from "./components/Game.tsx";
import { Rules } from "./components/Rules.tsx";
import { Stats } from "./components/Stats.tsx";
import { About } from "./components/About.tsx";
import { Archive } from "./components/Archive.tsx";
import { InputSheet } from "./components/InputSheet.tsx";
import { HintMap } from "./components/HintMap.tsx";
import { StatsSheet } from "./components/StatsSheet.tsx";
import { InfoOverlay } from "./components/InfoOverlay.tsx";
import { FeedbackModal } from "./components/FeedbackModal.tsx";
import { LinesOverlay } from "./components/LinesOverlay.tsx";
import { ResultOverlay } from "./components/ResultOverlay.tsx";
import { Icon } from "./components/icons.tsx";

export default function App() {
  const ctrl = useGame();
  const { g } = ctrl;

  useEffect(() => {
    document.documentElement.dataset.theme = "light";
  }, []);

  // Le bloc de contenu SEO (#seo-content, statique dans index.html) n'a de sens
  // que sur l'accueil : on l'expose via data-screen pour le masquer ailleurs (CSS).
  useEffect(() => {
    document.documentElement.dataset.screen = g.screen;
  }, [g.screen]);

  // Transition d'écran : fondu-glissé (l'accueil a sa propre cascade).
  const appRef = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (g.screen !== "home") {
        gsap.from(".screen", { opacity: 0, y: 10, duration: 0.32, ease: "power2.out" });
      }
    },
    { scope: appRef, dependencies: [g.screen] },
  );

  // Carte de partage pré-rendue dès le résultat : navigator.share doit rester
  // dans le geste utilisateur, pas après un rendu canvas asynchrone.
  const shareFile = useRef<File | null>(null);
  useEffect(() => {
    shareFile.current = null;
    const r = g.result;
    if (!r) return;
    let stale = false;
    const title =
      g.game === "daily"
        ? `Défi du ${prettyDate()}`
        : g.game === "archive"
          ? `Grille du ${prettyDate(g.puzzleDate)}`
          : "Entraînement";
    renderShareCard({
      title,
      subtitle: g.puzzleDate ? `nº ${puzzleNumber(g.puzzleDate)}` : "",
      lines: r.lines ?? linesFromEmoji(r.emoji),
      score: r.score, stars: r.stars, solved: r.solved, mistakes: r.mistakes,
      rare: r.rare, won: r.won,
      filename: g.puzzleDate ? `tamdoku-${g.puzzleDate}.png` : "tamdoku.png",
    })
      .then((f) => {
        if (!stale) shareFile.current = f;
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [g.result, g.game, g.puzzleDate]);

  const doShare = async () => {
    if (!g.result) return;
    track("share", { game: g.game, won: g.result.won });
    const text = shareText(g.game, g.result, g.puzzleDate);
    const done = () => ctrl.toast("Résultat copié !");
    const file = shareFile.current;
    if (file && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: shareCaption(g.game, g.result, g.puzzleDate) });
        return;
      } catch (e) {
        if ((e as DOMException).name === "AbortError") return; // partage annulé, pas un échec
      }
    }
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch (e) {
        if ((e as DOMException).name === "AbortError") return;
      }
    }
    // Desktop sans Web Share : l'image se télécharge, le texte part au presse-papier.
    if (file) {
      downloadFile(file);
      copy(text, () => ctrl.toast("Image téléchargée · texte copié !"));
      return;
    }
    copy(text, done);
  };

  return (
    <div className="app" ref={appRef}>
      {g.screen === "home" && <Home ctrl={ctrl} />}
      {g.screen === "game" && <Game ctrl={ctrl} />}
      {g.screen === "rules" && <Rules ctrl={ctrl} />}
      {g.screen === "stats" && <Stats ctrl={ctrl} />}
      {g.screen === "about" && <About ctrl={ctrl} />}
      {g.screen === "archive" && <Archive ctrl={ctrl} />}

      <InputSheet ctrl={ctrl} />
      <HintMap ctrl={ctrl} />
      <StatsSheet ctrl={ctrl} />
      <InfoOverlay ctrl={ctrl} />
      <FeedbackModal ctrl={ctrl} />
      <UnlockConfirm ctrl={ctrl} />
      <LinesOverlay ctrl={ctrl} />
      <ResultOverlay ctrl={ctrl} onShare={doShare} />

      {!g.linesOpen && (
        <button className="fab" onClick={ctrl.openLines} aria-label="Voir les lignes du réseau" title="Les lignes">
          <Icon name="map" size={23} />
        </button>
      )}

      {g.toast && <div className="toast">{g.toast}</div>}
    </div>
  );
}

function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
}

function copy(text: string, done: () => void): void {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => legacyCopy(text) && done());
    return;
  }
  if (legacyCopy(text)) done();
}

function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
