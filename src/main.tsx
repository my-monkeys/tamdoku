import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import App from "./App.tsx";
import "./styles.css";

gsap.registerPlugin(useGSAP);

const root = document.getElementById("root");
if (!root) throw new Error("#root introuvable");

// Écran de chargement : on attend les polices (avec un plancher pour éviter le
// simple flash et un plafond pour ne jamais rester bloqué), puis on monte l'app
// et on dissout le loader pendant que la cascade d'accueil démarre.
const BOOT_AT = performance.now();
const MIN_SPLASH = 550;
const MAX_WAIT = 2500;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fontsReady =
  "fonts" in document ? document.fonts.ready.then(() => undefined, () => undefined) : Promise.resolve();

function reveal() {
  document.documentElement.classList.add("app-ready");
  const pl = document.getElementById("preloader");
  if (pl) setTimeout(() => pl.remove(), 600);
}

Promise.race([fontsReady, wait(MAX_WAIT)]).then(async () => {
  const remaining = MIN_SPLASH - (performance.now() - BOOT_AT);
  if (remaining > 0) await wait(remaining);
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  requestAnimationFrame(() => requestAnimationFrame(reveal));
});
