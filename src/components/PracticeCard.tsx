import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { stationsOnLines } from "../data.ts";
import { linesPhrase } from "../format.ts";
import type { LineRef } from "../../engine/types.ts";
import type { useGame } from "../useGame.ts";

const ALL_LINES: LineRef[] = ["1", "2", "3", "4", "5"];

/**
 * Grille libre hors calendrier, au périmètre choisi (idée joueur, août 2026 :
 * « un mode ciblé sur une ou plusieurs lignes »). Rien coché = tout le réseau.
 */
export function PracticeCard({ ctrl }: { ctrl: ReturnType<typeof useGame> }) {
  const [picked, setPicked] = useState<LineRef[]>([]);
  const root = useRef<HTMLDivElement>(null);

  const toggle = (ref: LineRef) => {
    setPicked((prev) =>
      prev.includes(ref)
        ? prev.filter((r) => r !== ref)
        : ALL_LINES.filter((r) => r === ref || prev.includes(r)), // reste dans l'ordre 1→5
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

  const count = stationsOnLines(picked).length;
  const scope = picked.length === 0 ? "tout le réseau" : linesPhrase(picked);

  return (
    <div className="card practice" ref={root}>
      <div className="dhead">
        <span className="klabel">Entraînement</span>
        <span className="pcount">{count} stations</span>
      </div>
      <div className="ptitle">Une grille quand tu veux</div>
      <div className="psub">
        Sur {scope}. Hors classement&nbsp;: ni série, ni score enregistré.
      </div>

      <div className="lpicks" role="group" aria-label="Lignes de l’entraînement">
        {ALL_LINES.map((ref) => {
          const on = picked.includes(ref);
          return (
            <button
              key={ref}
              type="button"
              data-line={ref}
              className={`lpick rd v${ref} ${on ? "on" : ""}`}
              aria-pressed={on}
              aria-label={`Ligne ${ref}`}
              onClick={() => toggle(ref)}
            >
              {ref}
            </button>
          );
        })}
      </div>

      <button className="sbtn wide" onClick={() => ctrl.startPractice(picked)}>
        Lancer une grille
      </button>
    </div>
  );
}
