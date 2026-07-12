import { criterion } from "../data.ts";
import type { useGame } from "../useGame.ts";
import { LineDots } from "./tokens.tsx";
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

export function InputSheet({ ctrl }: { ctrl: ReturnType<typeof useGame> }) {
  const { g, suggestions, remainingForSel } = ctrl;
  if (!g.sheetOpen || !g.puzzle || g.sel < 0) return null;

  const rowCrit = criterion(g.puzzle.rows[Math.floor(g.sel / 3)]!);
  const colCrit = criterion(g.puzzle.cols[g.sel % 3]!);

  return (
    <>
      <div className="sheetback" onClick={ctrl.closeSheet} />
      <div className="sheet">
        <div className="grip" />
        <div className="scrit">
          <CritHeader crit={rowCrit} />
          <span className="x">×</span>
          <CritHeader crit={colCrit} />
        </div>

        {g.mode === "simple" && (
          <div className="poss">
            <b>{remainingForSel}</b> {remainingForSel > 1 ? "réponses possibles" : "réponse possible"}
          </div>
        )}

        <div className="inprow">
          <input
            className="inp"
            value={g.query}
            onChange={(e) => ctrl.setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                ctrl.submit(g.query);
              }
            }}
            ref={ctrl.inputRef}
            placeholder={g.mode === "simple" ? "Nom de la station…" : "Station (de mémoire)…"}
            autoComplete="off"
            autoCapitalize="words"
            autoCorrect="off"
          />
          <button className="vbtn" onClick={() => ctrl.submit(g.query)}>
            OK
          </button>
        </div>

        {suggestions.length > 0 && (
          <div className="sugs">
            {suggestions.map((s) => (
              <button key={s.id} className="sugitem" onClick={() => ctrl.submit(s.name)}>
                <span className="sname2">{s.name}</span>
                <LineDots stationId={s.id} />
              </button>
            ))}
          </div>
        )}

        {g.sheetMsg && <div className={`smsg ${g.sheetMsgCls}`}>{g.sheetMsg}</div>}

        <button className="hintbtn" onClick={ctrl.useHint}>
          <span className="hintbtn-ic">🗺️</span>
          {g.hinted[g.sel] ? "Revoir l’indice sur le plan" : "Bloqué ? Voir un indice sur le plan"}
        </button>

        <button className="passer" onClick={ctrl.closeSheet}>
          Fermer
        </button>
      </div>
    </>
  );
}
