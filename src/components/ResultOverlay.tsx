import { prettyDate } from "../format.ts";
import type { useGame } from "../useGame.ts";

const CONFETTI_COLORS = ["#0064B0", "#F07D00", "#009E3D", "#F4B223", "#C51A7F"];

function Confetti() {
  return (
    <>
      {Array.from({ length: 26 }, (_, i) => (
        <div
          key={i}
          className="conf"
          style={{
            left: `${3 + Math.random() * 94}%`,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animationDuration: `${1.5 + Math.random() * 1.3}s`,
            animationDelay: `${Math.random() * 0.5}s`,
          }}
        />
      ))}
    </>
  );
}

export function ResultOverlay({ ctrl, onShare }: { ctrl: ReturnType<typeof useGame>; onShare: () => void }) {
  const { g } = ctrl;
  const r = g.result;
  if (g.screen !== "game" || g.status === "playing" || g.status === "idle" || !r) return null;

  if (g.resultHidden) {
    return (
      <button className="reopen" onClick={ctrl.reopenResult}>
        Voir le résultat
      </button>
    );
  }

  const kick = r.won
    ? g.game === "daily"
      ? `Défi du ${prettyDate()}`
      : "Grille résolue"
    : "Plus de cœurs";

  return (
    <div className="ov">
      <div className="ovcard">
        {r.won && (
          <>
            <div className="tramfx">
              <div className="tram">
                <span className="face" />
                <span className="strip">
                  <b />
                  <b />
                  <b />
                  <b />
                </span>
                <span className="wheel w1" />
                <span className="wheel w2" />
              </div>
            </div>
            <Confetti />
          </>
        )}
        <div className="ovkick" style={{ marginTop: r.won ? "42px" : "2px" }}>
          {kick}
        </div>
        <div className="ovtitle">{r.won ? "Terminus !" : "Rame déraillée"}</div>
        <div className="scorebig">{r.score}</div>
        <div className="scoreout">/ 900 points d'originalité</div>
        <div className="stars">
          {[0, 1, 2].map((k) => (
            <span key={k} className={`star ${k < r.stars ? "" : "off"}`}>
              ★
            </span>
          ))}
        </div>
        <div className="emoji">
          {r.emoji.map((row, i) => (
            <div key={i}>{row}</div>
          ))}
        </div>
        <div className="ovstats">
          <div className="ovs">
            <span className="ovsn">{r.solved}/9</span>
            <span className="ovsl">Cases</span>
          </div>
          <div className="ovs">
            <span className="ovsn">{r.mistakes}</span>
            <span className="ovsl">Erreurs</span>
          </div>
          <div className="ovs">
            <span className="ovsn">{g.streak.current}</span>
            <span className="ovsl">Série</span>
          </div>
        </div>
        <div className="prose m" style={{ fontSize: "12.5px", marginBottom: 16 }}>
          Station la plus rare trouvée : <b style={{ color: "var(--ink)" }}>{r.rare}</b>
        </div>
        <div className="ovbtns">
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
