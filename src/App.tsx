import { useEffect, useState } from "react";
import { shareText } from "./format.ts";
import { useGame } from "./useGame.ts";
import { Home } from "./components/Home.tsx";
import { Game } from "./components/Game.tsx";
import { Rules } from "./components/Rules.tsx";
import { Stats } from "./components/Stats.tsx";
import { About } from "./components/About.tsx";
import { InputSheet } from "./components/InputSheet.tsx";
import { InfoOverlay } from "./components/InfoOverlay.tsx";
import { ResultOverlay } from "./components/ResultOverlay.tsx";

function usePrefersDark(): boolean {
  const query = "(prefers-color-scheme: dark)";
  const [dark, setDark] = useState(() =>
    typeof matchMedia === "function" ? matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mql = matchMedia(query);
    const on = () => setDark(mql.matches);
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, []);
  return dark;
}

export default function App() {
  const ctrl = useGame();
  const { g } = ctrl;
  const dark = usePrefersDark();

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.body.classList.toggle("dark-page", dark);
  }, [dark]);

  const doShare = () => {
    if (!g.result) return;
    const text = shareText(g.game, g.result);
    const done = () => ctrl.toast("Résultat copié !");
    if (navigator.share) {
      navigator.share({ text }).catch(() => copy(text, done));
    } else {
      copy(text, done);
    }
  };

  return (
    <div className={`app${dark ? " dark" : ""}`}>
      {g.screen === "home" && <Home ctrl={ctrl} />}
      {g.screen === "game" && <Game ctrl={ctrl} />}
      {g.screen === "rules" && <Rules ctrl={ctrl} />}
      {g.screen === "stats" && <Stats ctrl={ctrl} />}
      {g.screen === "about" && <About ctrl={ctrl} />}

      <InputSheet ctrl={ctrl} />
      <InfoOverlay ctrl={ctrl} />
      <ResultOverlay ctrl={ctrl} onShare={doShare} />

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
