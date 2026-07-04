import { prettyDate } from "../format.ts";
import type { useGame } from "../useGame.ts";
import { LineLegend } from "./tokens.tsx";
import { Icon } from "./icons.tsx";

const LINE_COLORS = ["#0064B0", "#F07D00", "#009E3D", "#F4B223", "#C51A7F"];

/** Confetti sobre aux couleurs des lignes, uniquement à la victoire. */
function Confetti() {
  return (
    <div className="res-conf" aria-hidden="true">
      {Array.from({ length: 18 }, (_, i) => (
        <span
          key={i}
          className="cf"
          style={{
            left: `${5 + Math.random() * 90}%`,
            background: LINE_COLORS[i % LINE_COLORS.length],
            animationDuration: `${1.8 + Math.random() * 1.2}s`,
            animationDelay: `${Math.random() * 0.4}s`,
          }}
        />
      ))}
    </div>
  );
}

export function ResultOverlay({ ctrl, onShare }: { ctrl: ReturnType<typeof useGame>; onShare: () => void }) {
  const { g } = ctrl;
  const r = g.result;
  if (g.screen !== "game" || g.status === "playing" || g.status === "idle" || !r) return null;

  // Grille masquée : pastille flottante pour revenir au résultat.
  if (g.resultHidden) {
    return (
      <button className="reopen" onClick={ctrl.reopenResult}>
        <Icon name="back" size={17} /> Retour
      </button>
    );
  }

  const kick = r.won
    ? g.game === "daily"
      ? `Défi du ${prettyDate()}`
      : g.game === "archive"
        ? `Grille du ${prettyDate(g.puzzleDate)}`
        : "Grille résolue"
    : "Plus de cœurs";

  return (
    <div className="ov">
      <div className="rescard">
        <div className="res-rail">
          {[1, 2, 3, 4, 5].map((n) => (
            <i key={n} className={`v${n}`} />
          ))}
        </div>
        {r.won && <Confetti />}

        <div className="res-kick">{kick}</div>
        <div className="res-title">{r.won ? "Terminus !" : "Rame déraillée"}</div>

        <div className="res-scorewrap">
          <div className="res-score">
            {r.score}
            <span className="res-max">/900</span>
          </div>
          <div className="res-scorelbl">points d’originalité</div>
          <div className="res-stars">
            {[0, 1, 2].map((k) => (
              <span key={k} className={`star ${k < r.stars ? "" : "off"}`}>
                ★
              </span>
            ))}
          </div>
        </div>

        <div className="res-emoji">
          {r.emoji.map((row, i) => (
            <div key={i}>{row}</div>
          ))}
        </div>
        <div className="res-emocap">
          <LineLegend />
        </div>

        <div className="res-stats">
          <div className="res-stat">
            <b>{r.solved}/9</b>
            <span>Cases</span>
          </div>
          <div className="res-stat">
            <b>{r.mistakes}</b>
            <span>Erreurs</span>
          </div>
          <div className="res-stat">
            <b>{g.streak.current}</b>
            <span>Série</span>
          </div>
        </div>

        <div className="res-rare">
          Score d’originalité : plus une station est rare, plus elle rapporte.
          <br />
          Ta plus rare : <b>{r.rare}</b>
        </div>

        <div className="res-btns">
          <button className="obtn" onClick={onShare}>
            Partager mon résultat
          </button>
          <button className="obtn sec" onClick={ctrl.hideResult}>
            Voir la grille
          </button>
          <button className="obtn sec" onClick={ctrl.goHome}>
            Accueil
          </button>
        </div>
      </div>
    </div>
  );
}
