import type { useGame } from "../useGame.ts";
import { Icon } from "./icons.tsx";

export function Stats({ ctrl }: { ctrl: ReturnType<typeof useGame> }) {
  const { g } = ctrl;
  return (
    <div className="screen">
      <div className="subhead">
        <button className="icbtn" onClick={ctrl.goBack} aria-label="Retour">
          <Icon name="back" size={22} />
        </button>
        <span className="subttl">Statistiques</span>
      </div>
      <div className="sub">
        <div className="bigstat">
          <div className="bscard">
            <div className="bsn">{g.stats.played}</div>
            <div className="bsl">Parties</div>
          </div>
          <div className="bscard">
            <div className="bsn">{g.stats.wins}</div>
            <div className="bsl">Gagnées</div>
          </div>
          <div className="bscard">
            <div className="bsn">{g.stats.bestScore}</div>
            <div className="bsl">Meilleur score</div>
          </div>
        </div>
        <div className="bigstat">
          <div className="bscard">
            <div className="bsn">{g.streak.current}</div>
            <div className="bsl">Série actuelle</div>
          </div>
          <div className="bscard">
            <div className="bsn">{g.streak.best}</div>
            <div className="bsl">Record de série</div>
          </div>
        </div>
        <p className="prose m" style={{ textAlign: "center", fontSize: 13 }}>
          Le défi du jour est le même pour tout le monde et se renouvelle chaque nuit. Reviens demain
          pour prolonger ta série !
        </p>
        <button className="obtn sec" onClick={ctrl.goBack}>
          Retour
        </button>
      </div>
    </div>
  );
}
