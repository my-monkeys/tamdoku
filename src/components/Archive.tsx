import { archiveDates, loadDaySave, puzzleNumber, type useGame } from "../useGame.ts";
import { prettyDateLong, todayStr } from "../format.ts";
import type { DailySave } from "../storage.ts";
import { Icon } from "./icons.tsx";

function Status({ save }: { save: DailySave | null }) {
  if (!save) return <span className="astatus play">Jouer ▸</span>;
  if (save.status === "playing") return <span className="astatus todo">En cours</span>;
  if (save.status === "won") return <span className="astatus won">✓ {save.result?.score ?? 0}</span>;
  return <span className="astatus lost">Terminé</span>;
}

export function Archive({ ctrl }: { ctrl: ReturnType<typeof useGame> }) {
  const dates = archiveDates();
  const today = todayStr();

  return (
    <div className="screen">
      <div className="subhead">
        <button className="icbtn" onClick={ctrl.goHome} aria-label="Retour">
          <Icon name="back" size={22} />
        </button>
        <span className="subttl">Archive</span>
      </div>
      <div className="sub">
        <p className="prose m" style={{ fontSize: 13, marginTop: -6 }}>
          Rejoue les grilles des jours précédents. Ces parties sont des bonus : elles ne comptent
          pas dans ta série quotidienne.
        </p>
        <div className="card arch">
          {dates.map((date) => {
            const isToday = date === today;
            const save = loadDaySave(date);
            return (
              <button key={date} className="arow" onClick={() => ctrl.startArchive(date)}>
                <span className="anum">#{puzzleNumber(date)}</span>
                <span className="adate">{isToday ? "Aujourd’hui" : prettyDateLong(date)}</span>
                <Status save={save} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
