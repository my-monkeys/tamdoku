import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { linesFor, stationsOnLines } from "../data.ts";
import { linesPhrase, todayStr } from "../format.ts";
import type { LineRef } from "../../engine/types.ts";
import type { useGame } from "../useGame.ts";

/**
 * Une grille demande 9 stations distinctes (une par case) : en dessous, aucun
 * tirage n'est possible. Le Bustram, seul, n'en dessert que 8 — il ne se joue
 * donc qu'avec au moins une autre ligne.
 */
const MIN_PRACTICE_STATIONS = 9;

/**
 * Grille libre hors calendrier, au périmètre choisi (idée joueur, août 2026 :
 * « un mode ciblé sur une ou plusieurs lignes »). Rien coché = tout le réseau.
 */
export function PracticeCard({ ctrl }: { ctrl: ReturnType<typeof useGame> }) {
  const [picked, setPicked] = useState<LineRef[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const today = todayStr();
  const allLines = linesFor(today);

  const toggle = (ref: LineRef) => {
    setPicked((prev) =>
      prev.includes(ref)
        ? prev.filter((r) => r !== ref)
        : allLines.filter((r) => r === ref || prev.includes(r)), // reste dans l'ordre du réseau
    );
    const dot = root.current?.querySelector<HTMLElement>(`.lpick[data-line="${ref}"]`);
    if (dot) gsap.fromTo(dot, { scale: 0.86 }, { scale: 1, duration: 0.34, ease: "back.out(2.4)" });
  };

  useGSAP(
    () => {
      gsap.fromTo(".psub", { opacity: 0.35 }, { opacity: 1, duration: 0.3, ease: "power2.out" });
    },
    { scope: root, dependencies: [picked.join()] },
  );

  const count = stationsOnLines(picked, today).length;
  const scope = picked.length === 0 ? "tout le réseau" : linesPhrase(picked);
  const tooSmall = count < MIN_PRACTICE_STATIONS;

  return (
    <div className="card practice" ref={root}>
      <div className="dhead">
        <span className="klabel">Entraînement</span>
        <span className="pcount">{count} stations</span>
      </div>
      <div className="ptitle">Une grille quand tu veux</div>
      <div className="psub">
        {tooSmall ? (
          <>Trop peu de stations pour une grille&nbsp;: ajoute une ligne.</>
        ) : (
          <>Sur {scope}. Hors classement&nbsp;: ni série, ni score enregistré.</>
        )}
      </div>

      <div className="lpicks" role="group" aria-label="Lignes de l’entraînement">
        {allLines.map((ref) => {
          const on = picked.includes(ref);
          return (
            <button
              key={ref}
              type="button"
              data-line={ref}
              className={`lpick rd v${ref} ${on ? "on" : ""}`}
              aria-pressed={on}
              aria-label={ref === "A" ? "Bustram A" : `Ligne ${ref}`}
              onClick={() => toggle(ref)}
            >
              {ref}
            </button>
          );
        })}
      </div>

      <button
        className="sbtn wide"
        disabled={tooSmall}
        onClick={() => ctrl.startPractice(picked)}
      >
        Lancer une grille
      </button>
    </div>
  );
}
