import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { track } from "./analytics.ts";
import { shareText } from "./format.ts";
import { useGame } from "./useGame.ts";
import { Home } from "./components/Home.tsx";
import { Game } from "./components/Game.tsx";
import { Rules } from "./components/Rules.tsx";
import { Stats } from "./components/Stats.tsx";
import { About } from "./components/About.tsx";
import { Archive } from "./components/Archive.tsx";
import { InputSheet } from "./components/InputSheet.tsx";
import { HintMap } from "./components/HintMap.tsx";
import { StatsSheet } from "./components/StatsSheet.tsx";
import { InfoOverlay } from "./components/InfoOverlay.tsx";
import { FeedbackModal } from "./components/FeedbackModal.tsx";
import { ResultOverlay } from "./components/ResultOverlay.tsx";

export default function App() {
  const ctrl = useGame();
  const { g } = ctrl;

  useEffect(() => {
    document.documentElement.dataset.theme = "light";
  }, []);

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

  const doShare = () => {
    if (!g.result) return;
    track("share", { game: g.game, won: g.result.won });
    const text = shareText(g.game, g.result, g.puzzleDate);
    const done = () => ctrl.toast("Résultat copié !");
    if (navigator.share) {
      navigator.share({ text }).catch(() => copy(text, done));
    } else {
      copy(text, done);
    }
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
      <ResultOverlay ctrl={ctrl} onShare={doShare} />

      {!g.feedbackOpen && (
        <button className="fab" onClick={ctrl.openFeedback} aria-label="Donner un retour" title="Un retour ?">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
            <path d="M9 18h6" />
            <path d="M10 22h4" />
          </svg>
        </button>
      )}

      {g.toast && <div className="toast">{g.toast}</div>}
    </div>
  );
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
