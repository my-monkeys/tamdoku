import { criterion } from "../data.ts";
import type { useGame } from "../useGame.ts";
import { CritGlyph, hasGlyph } from "./icons.tsx";
import { usePopIn } from "../usePopIn.ts";

export function InfoOverlay({ ctrl }: { ctrl: ReturnType<typeof useGame> }) {
  const { g } = ctrl;
  const card = usePopIn<HTMLDivElement>([g.infoCrit]);
  if (!g.infoCrit) return null;
  const c = criterion(g.infoCrit);

  return (
    <div className="ov" onClick={ctrl.closeInfo}>
      <div className="infocard" ref={card} onClick={(e) => e.stopPropagation()}>
        {(c.kind === "line" || hasGlyph(c)) && (
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
        )}
        <div className="infotitle">{c.label}</div>
        <div className="infotext">{c.expl}</div>
        <button className="obtn" onClick={ctrl.closeInfo}>
          Compris
        </button>
      </div>
    </div>
  );
}
