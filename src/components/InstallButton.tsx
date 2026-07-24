import { useState, useSyncExternalStore } from "react";
import { track } from "../analytics.ts";
import {
  clearInstallPrompt,
  getInstallPrompt,
  subscribeInstallPrompt,
} from "../installPrompt.ts";
import { usePopIn } from "../usePopIn.ts";
import { Icon } from "./icons.tsx";

/** L'app tourne-t-elle déjà installée (fenêtre standalone) ? */
function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

/** iPhone/iPad — y compris iPadOS qui se présente comme un Mac tactile. */
function isIOS(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}

/**
 * Carte « Installer l'app » de l'accueil. Trois chemins :
 * — Chrome/Edge/Android : `beforeinstallprompt` capturé → dialogue natif au clic ;
 * — iOS Safari : pas d'API, on affiche le guide Partager → Sur l'écran d'accueil ;
 * — sinon (Firefox, déjà installée…) : rien.
 */
export function InstallButton() {
  const native = useSyncExternalStore(subscribeInstallPrompt, getInstallPrompt);
  const [iosGuide, setIosGuide] = useState(false);
  // Refus du dialogue natif : on n'insiste plus pour cette session.
  const [snoozed, setSnoozed] = useState(false);
  const card = usePopIn<HTMLDivElement>([iosGuide]);

  const ios = isIOS() && !isStandalone();
  if (snoozed || isStandalone() || (!native && !ios)) return null;

  const install = async () => {
    if (!native) {
      track("pwa_install_prompt", { platform: "ios", outcome: "guide" });
      setIosGuide(true);
      return;
    }
    await native.prompt();
    const { outcome } = await native.userChoice;
    track("pwa_install_prompt", { platform: "native", outcome });
    clearInstallPrompt();
    if (outcome === "dismissed") setSnoozed(true);
  };

  return (
    <>
      <button className="home-fb" onClick={install}>
        <Icon name="install" size={17} />
        <span>Installe l'app — jouable même hors-ligne</span>
        <span className="home-fb-go">›</span>
      </button>

      {iosGuide && (
        <div className="ov" onClick={() => setIosGuide(false)}>
          <div className="infocard" ref={card} onClick={(e) => e.stopPropagation()}>
            <div className="infochip">
              <span
                className="rd mini"
                style={{ width: 48, height: 48, background: "var(--soft)", color: "var(--ink)" }}
              >
                <Icon name="share-ios" size={24} />
              </span>
            </div>
            <div className="infotitle">Installer sur iPhone</div>
            <div className="infotext">
              Dans Safari, touche le bouton <b>Partager</b> (le carré avec une flèche vers le haut),
              puis choisis <b>« Sur l'écran d'accueil »</b>. Tamdoku s'ouvrira comme une vraie app,
              même sans connexion.
            </div>
            <button className="obtn" onClick={() => setIosGuide(false)}>
              Compris
            </button>
          </div>
        </div>
      )}
    </>
  );
}
