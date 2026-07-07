import { useMemo, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { byId, criterion } from "../data.ts";
import { revealGrid } from "../../engine/matching.ts";
import { MAX_MISTAKES, type useGame } from "../useGame.ts";
import { prettyDate } from "../format.ts";
import { LineDots, LineLegend } from "./tokens.tsx";
import { CritGlyph, hasGlyph, Icon } from "./icons.tsx";

export function Game({ ctrl }: { ctrl: ReturnType<typeof useGame> }) {
  const { g } = ctrl;
  const finished = g.status === "won" || g.status === "lost";
  // Partie finie → on révèle une réponse dans les cases vides (la 1re valide libre).
  const revealed = useMemo(
    () => (g.puzzle && finished ? revealGrid(g.puzzle.valid.map((c) => new Set(c)), g.cells) : null),
    [g.puzzle, finished, g.cells],
  );
  const solved = g.cells.filter(Boolean).length;

  // Pop de la case qui vient d'être remplie (fast-start / slow-end, comme Statiodle).
  const gridRef = useRef<HTMLDivElement>(null);
  const prevCells = useRef(g.cells);
  useGSAP(
    () => {
      const prev = prevCells.current;
      let placed = -1;
      for (let i = 0; i < 9; i++) if (!prev[i] && g.cells[i]) placed = i;
      prevCells.current = g.cells;
      if (placed >= 0) {
        const cells = gridRef.current?.querySelectorAll(".gc.ans");
        const el = cells?.[placed];
        if (el)
          gsap.from(el, {
            scale: 0.35,
            opacity: 0,
            duration: 0.62,
            ease: "back.out(1.5)",
            // Nettoie les styles inline laissés par le tween.
            clearProps: "transform,opacity",
          });
      }
    },
    { scope: gridRef, dependencies: [solved] },
  );

  if (!g.puzzle) return null;
  const puzzle = g.puzzle;

  return (
    <div className="screen">
      <div className="gbar">
        <button className="icbtn" onClick={ctrl.goHome} aria-label="Retour">
          <Icon name="back" size={22} />
        </button>
        <div className="gtitle">
          <span className="gchip">
            {g.game === "daily"
              ? "Défi du jour"
              : g.game === "archive"
                ? `Grille du ${prettyDate(g.puzzleDate)}`
                : "Entraînement"}
          </span>
          <span className="gmode">{g.mode === "simple" ? "Mode simple" : "Mode expert"}</span>
        </div>
        <button className="icbtn" onClick={() => ctrl.goScreen("rules")} aria-label="Aide">
          <Icon name="help" size={21} />
        </button>
      </div>

      <div className="statusbar">
        <div className="hearts">
          {Array.from({ length: MAX_MISTAKES }, (_, k) => {
            const alive = k < MAX_MISTAKES - g.mistakes;
            return (
              <span key={k} className={`heart ${alive ? "" : "off"}`}>
                {alive ? "♥" : "♡"}
              </span>
            );
          })}
        </div>
        <div className="solved">{solved}/9 stations</div>
        <div className="hint">
          {finished ? (g.puzzleDate ? "Clique une case pour les stats" : "") : "Tape une case"}
        </div>
      </div>

      <div className="gridwrap">
        <div className="grid3" ref={gridRef}>
          <button className="gc corner" />
          {puzzle.cols.map((id) => {
            const c = criterion(id);
            return (
              <button key={`col-${id}`} className="gc head" onClick={() => ctrl.openInfo(id)}>
                {c.kind === "line" ? (
                  <>
                    <span className={`rd mini ${c.valClass}`}>{c.n}</span>
                    <span className="qm">?</span>
                  </>
                ) : (
                  <>
                    {hasGlyph(c) && (
                      <span className="aico">
                        <CritGlyph crit={c} size={18} />
                      </span>
                    )}
                    <span className={`alab${hasGlyph(c) ? "" : " solo"}`}>{c.short}</span>
                    <span className="qm">?</span>
                  </>
                )}
              </button>
            );
          })}

          {[0, 1, 2].map((r) => {
            const rowId = puzzle.rows[r]!;
            const rc = criterion(rowId);
            return (
              <RowFragment key={`row-${r}`}>
                <button className="gc head" onClick={() => ctrl.openInfo(rowId)}>
                  {rc.kind === "line" ? (
                    <>
                      <span className={`rd mini ${rc.valClass}`}>{rc.n}</span>
                      <span className="qm">?</span>
                    </>
                  ) : (
                    <>
                      {hasGlyph(rc) && (
                        <span className="aico">
                          <CritGlyph crit={rc} size={18} />
                        </span>
                      )}
                      <span className={`alab${hasGlyph(rc) ? "" : " solo"}`}>{rc.short}</span>
                      <span className="qm">?</span>
                    </>
                  )}
                </button>
                {[0, 1, 2].map((c) => {
                  const ci = r * 3 + c;
                  const id = g.cells[ci];
                  if (id) {
                    const station = byId.get(id)!;
                    return (
                      <button
                        key={ci}
                        className="gc ans filled"
                        onClick={() => (finished ? ctrl.openCellStats(ci) : ctrl.toast("Station verrouillée 🔒"))}
                      >
                        <span className="sname">{station.name}</span>
                        <LineDots stationId={id} />
                        <span className="locki">🔒</span>
                      </button>
                    );
                  }
                  const rev = revealed?.[ci];
                  if (rev) {
                    const station = byId.get(rev)!;
                    return (
                      <button key={ci} className="gc ans reveal" onClick={() => ctrl.openCellStats(ci)}>
                        <span className="sname">{station.name}</span>
                        <LineDots stationId={rev} />
                        <span className="soli">réponse</span>
                      </button>
                    );
                  }
                  const sel = g.sel === ci && g.sheetOpen;
                  const shake = g.shakeCell === ci;
                  return (
                    <button
                      key={ci}
                      className={`gc ans empty${sel ? " sel" : ""}${shake ? " shake" : ""}`}
                      onClick={() => ctrl.openSheet(ci)}
                    >
                      <span className="plus">＋</span>
                    </button>
                  );
                })}
              </RowFragment>
            );
          })}
        </div>
      </div>

      <div className="legend">
        Chaque case = une station sur le critère de sa ligne ET de sa colonne.
        <LineLegend />
      </div>
    </div>
  );
}

/** La grille CSS est plate : on émet le libellé de ligne puis ses 3 cases sans wrapper. */
function RowFragment({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
