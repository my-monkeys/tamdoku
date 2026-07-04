import { criteria, pool } from "../data.ts";
import type { useGame } from "../useGame.ts";

const STEPS: { n: number; body: React.ReactNode }[] = [
  {
    n: 1,
    body: (
      <>
        Une grille <b>3×3</b> apparaît. Chaque <b>ligne</b> et chaque <b>colonne</b> possède un
        critère (une ligne de tram ou une catégorie).
      </>
    ),
  },
  {
    n: 2,
    body: (
      <>
        Remplis chaque case avec une <b>station du tram</b> qui respecte à la fois le critère de sa
        ligne <b>et</b> celui de sa colonne.
      </>
    ),
  },
  {
    n: 3,
    body: (
      <>
        Une station ne sert qu'<b>une seule fois</b>. Une fois validée, elle est <b>verrouillée</b>.
        Seules les lignes qui s'arrêtent vraiment à la station comptent.
      </>
    ),
  },
  {
    n: 4,
    body: (
      <>
        <b>3 erreurs</b> maximum. Score d'originalité jusqu'à <b>900</b> : une station rare et peu
        évidente rapporte plus de points.
      </>
    ),
  },
  {
    n: 5,
    body: (
      <>
        Touche un critère <b>?</b> pour lire son explication. Mode <b>Simple</b> : suggestions +
        nombre de réponses. Mode <b>Expert</b> : de mémoire.
      </>
    ),
  },
];

export function Rules({ ctrl }: { ctrl: ReturnType<typeof useGame> }) {
  return (
    <div className="screen">
      <div className="subhead">
        <button className="icbtn" onClick={ctrl.goHome}>
          ‹
        </button>
        <span className="subttl">Comment jouer</span>
      </div>
      <div className="sub">
        {STEPS.map((s) => (
          <div className="step" key={s.n}>
            <span className="stepn">{s.n}</span>
            <span className="steptx">{s.body}</span>
          </div>
        ))}

        <div className="card">
          <div className="klabel" style={{ color: "var(--muted)", marginBottom: 4 }}>
            Les critères possibles
          </div>
          {pool.map((r) => {
            const c = criteria.get(r.id)!;
            return (
              <div className="critline" key={r.id}>
                {c.kind === "line" ? (
                  <span className={`rd mini ${c.valClass}`}>{c.n}</span>
                ) : (
                  <span
                    className="rd mini"
                    style={{ background: "var(--soft)", color: "var(--ink)", fontSize: 15 }}
                  >
                    {c.icon}
                  </span>
                )}
                <div style={{ flex: 1 }}>
                  <div className="critn">{c.label}</div>
                  <div className="critd">{c.expl}</div>
                </div>
              </div>
            );
          })}
        </div>

        <button className="obtn" onClick={ctrl.goHome}>
          C'est parti
        </button>
      </div>
    </div>
  );
}
