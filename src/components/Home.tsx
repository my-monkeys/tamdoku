import { criterion } from "../data.ts";
import { prettyDate } from "../format.ts";
import type { useGame } from "../useGame.ts";

export function Home({ ctrl }: { ctrl: ReturnType<typeof useGame> }) {
  const { g } = ctrl;
  const done = g.dailySave?.status === "won" || g.dailySave?.status === "lost";
  const chips = [...g.dailyPuzzle.rows, ...g.dailyPuzzle.cols].map(criterion);
  const title = done
    ? g.dailySave?.status === "won"
      ? "Défi réussi ✓"
      : "Défi terminé"
    : "La grille du jour";
  const sub = done
    ? `Score : ${g.dailySave?.result?.score ?? 0}/900 · ${g.dailySave?.result?.solved ?? 0}/9 cases`
    : "Une nouvelle grille, la même pour tout le monde. Trouve les 9 stations.";

  return (
    <div className="screen home">
      <div className="pad stack">
        <div className="brandrow">
          <div className="tagpill">Montpellier · TaM</div>
          <div className="brand">Tamdoku</div>
          <div className="dots">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={`dot v${n}`} />
            ))}
          </div>
          <div className="brandsub">La grille de stations du tram de Montpellier</div>
        </div>

        <div className="card daily">
          <div className="rail">
            {[1, 2, 3, 4, 5].map((n) => (
              <i key={n} className={`v${n}`} />
            ))}
          </div>
          <div className="dhead">
            <span className="klabel">Défi du jour</span>
            <span className="ddate">{prettyDate()}</span>
          </div>
          <div className="dtitle">{title}</div>
          <div className="dsub">{sub}</div>
          <div className="chiprow">
            {chips.map((c, i) => (
              <span className="chip" key={`${c.ruleId}-${i}`}>
                {c.kind === "line" && <span className={`rd ${c.valClass}`}>{c.n}</span>}
                {c.short}
              </span>
            ))}
          </div>
          <div className="seg">
            <button
              className={`segb ${g.mode === "simple" ? "on" : ""}`}
              onClick={() => ctrl.setMode("simple")}
            >
              Simple<span className="sst">suggestions</span>
            </button>
            <button
              className={`segb ${g.mode === "expert" ? "on" : ""}`}
              onClick={() => ctrl.setMode("expert")}
            >
              Expert<span className="sst">de mémoire</span>
            </button>
          </div>
          <button className={`bigbtn ${done ? "done" : ""}`} onClick={ctrl.startDaily}>
            {done ? "Revoir mon résultat" : "Jouer le défi"}
          </button>
        </div>

        <div className="teaser">
          <div className="tcell">
            <div className="tnum">{g.stats.played}</div>
            <div className="tlab">Parties</div>
          </div>
          <div className="tcell">
            <div className="tnum">{g.stats.bestScore}</div>
            <div className="tlab">Meilleur score</div>
          </div>
          <div className="tcell">
            <div className="tnum">{g.streak.current}</div>
            <div className="tlab">Série</div>
          </div>
        </div>
      </div>

      <div className="footlinks">
        <button className="flink" onClick={() => ctrl.goScreen("rules")}>
          Règles du jeu
        </button>
        <button className="flink" onClick={() => ctrl.goScreen("stats")}>
          Statistiques
        </button>
        <button className="flink" onClick={() => ctrl.goScreen("about")}>
          À propos
        </button>
      </div>
    </div>
  );
}
