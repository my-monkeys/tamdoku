import { criterion } from "../data.ts";
import type { useGame } from "../useGame.ts";
import { CritGlyph } from "./icons.tsx";

export function InfoOverlay({ ctrl }: { ctrl: ReturnType<typeof useGame> }) {
  const { g } = ctrl;
  if (!g.infoCrit) return null;
  const c = criterion(g.infoCrit);

  return (
    <div className="ov" onClick={ctrl.closeInfo}>
      <div className="infocard" onClick={(e) => e.stopPropagation()}>
        <div className="infochip">
          {c.kind === "line" ? (
            <span className={`rd mini ${c.valClass}`} style={{ width: 48, height: 48, fontSize: 22 }}>
              {c.n}
            </span>
          ) : (
            <span
              className="rd mini"
              style={{ width: 48, height: 48, fontSize: 22, background: "var(--soft)", color: "var(--ink)" }}
            >
              <CritGlyph crit={c} size={24} />
            </span>
          )}
        </div>
        <div className="infotitle">{c.label}</div>
        <div className="infotext">{c.expl}</div>
        <button className="obtn" style={{ marginTop: 16 }} onClick={ctrl.closeInfo}>
          Compris
        </button>
      </div>
    </div>
  );
}
