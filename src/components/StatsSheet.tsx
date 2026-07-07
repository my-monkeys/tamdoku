import { byId, criterion } from "../data.ts";
import type { useGame } from "../useGame.ts";
import { CritGlyph } from "./icons.tsx";
import type { Criterion } from "../../engine/criteria.ts";

function CritHeader({ crit }: { crit: Criterion }) {
  if (crit.kind === "line") return <span className={`rd mini ${crit.valClass}`}>{crit.n}</span>;
  return (
    <span className="achip">
      <CritGlyph crit={crit} size={15} /> {crit.short}
    </span>
  );
}

/** Vert TaM (L5) pour distinguer la réponse du joueur. */
const MINE = "#287530";

export function StatsSheet({ ctrl }: { ctrl: ReturnType<typeof useGame> }) {
  const { g } = ctrl;
  const finished = g.status === "won" || g.status === "lost";
  if (!finished || g.statsCell < 0 || !g.puzzle) return null;

  const ci = g.statsCell;
  const rowCrit = criterion(g.puzzle.rows[Math.floor(ci / 3)]!);
  const colCrit = criterion(g.puzzle.cols[ci % 3]!);

  const raw = g.cellStats?.[ci] ?? null;
  const mine = g.cells[ci];
  let answers = raw ? raw.answers.slice() : [];
  let total = raw ? raw.total : 0;
  // La réponse du joueur peut manquer si le fetch a devancé son propre envoi.
  if (mine && !answers.some((a) => a.station === mine)) {
    answers.push({ station: mine, n: 1 });
    total += 1;
  }
  answers.sort((a, b) => b.n - a.n);
  const top = answers.length > 0 ? answers[0]!.n : 1;

  return (
    <>
      <div className="sheetback" onClick={ctrl.closeCellStats} />
      <div className="sheet">
        <div className="grip" />
        <div className="scrit">
          <CritHeader crit={rowCrit} />
          <span className="x">×</span>
          <CritHeader crit={colCrit} />
        </div>

        <div className="poss">
          {total > 0
            ? `${total} ${total > 1 ? "réponses données" : "réponse donnée"}`
            : "Réponses des joueurs"}
        </div>

        {total === 0 ? (
          <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, padding: "18px 6px" }}>
            Pas encore de réponses enregistrées pour cette case.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            {answers.map((a) => {
              const st = byId.get(a.station);
              const isMine = a.station === mine;
              const pct = Math.round((a.n / total) * 100);
              return (
                <div key={a.station}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 3 }}>
                    <span style={{ fontWeight: isMine ? 700 : 500, color: isMine ? MINE : "var(--ink)" }}>
                      {st ? st.name : a.station}
                      {isMine ? " · toi" : ""}
                    </span>
                    <span style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.max(4, (a.n / top) * 100)}%`,
                        height: "100%",
                        background: isMine ? MINE : "var(--muted)",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button className="passer" onClick={ctrl.closeCellStats}>
          Fermer
        </button>
      </div>
    </>
  );
}
