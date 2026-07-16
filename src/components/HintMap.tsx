import { useEffect, useRef, useState } from "react";
import { mapGeo } from "../mapGeo.ts";
import type { useGame } from "../useGame.ts";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Règles de distance à la Comédie : rayon à tracer sur le plan quand la case en a une. */
const DISTANCE_RINGS: Record<string, { meters: number; label: string }> = {
  "geo-proche-comedie": { meters: 1_500, label: "1,5 km" },
  "geo-loin-comedie": { meters: 5_000, label: "5 km" },
};

/**
 * Indice : plan du réseau (positions réelles), les stations qui cochent les deux
 * critères de la case cerclées en rouge — SANS aucun nom. Au joueur d'identifier
 * lesquelles. Pan (glisser) + zoom (molette / pincement / boutons).
 */
export function HintMap({ ctrl }: { ctrl: ReturnType<typeof useGame> }) {
  const { g } = ctrl;
  const vp = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDist = useRef<number | null>(null);
  const [t, setT] = useState({ k: 1, x: 0, y: 0 });

  // Recadre à l'ouverture (le composant reste monté, on repart propre).
  useEffect(() => {
    if (g.hintMapCell < 0) return;
    const r = vp.current?.getBoundingClientRect();
    const sh = r ? r.width * (mapGeo.height / mapGeo.width) : 0;
    setT({ k: 1, x: 0, y: r && sh < r.height ? (r.height - sh) / 2 : 0 });
  }, [g.hintMapCell]);

  if (g.hintMapCell < 0 || !g.puzzle) return null;
  const valid = new Set(g.puzzle.valid[g.hintMapCell]);
  const cellRules = [g.puzzle.rows[Math.floor(g.hintMapCell / 3)]!, g.puzzle.cols[g.hintMapCell % 3]!];
  const ring = cellRules.map((id) => DISTANCE_RINGS[id]).find(Boolean);
  const comedie = mapGeo.points.find((p) => p.id === "comedie")!;
  // Marqueurs & traits à taille d'écran ~constante : on contre-scale par 1/zoom
  // pour qu'en zoomant la géographie s'écarte sans que les cercles restent collés.
  const iz = 1 / t.k;

  const fit = (nt: { k: number; x: number; y: number }) => {
    const r = vp.current?.getBoundingClientRect();
    if (!r) return nt;
    const sw = r.width * nt.k;
    const sh = r.width * (mapGeo.height / mapGeo.width) * nt.k;
    return {
      k: nt.k,
      x: sw <= r.width ? (r.width - sw) / 2 : clamp(nt.x, r.width - sw, 0),
      y: sh <= r.height ? (r.height - sh) / 2 : clamp(nt.y, r.height - sh, 0),
    };
  };

  const zoomAt = (fx: number, fy: number, factor: number) =>
    setT((cur) => {
      const k = clamp(cur.k * factor, 1, 6);
      const ratio = k / cur.k;
      return fit({ k, x: fx - (fx - cur.x) * ratio, y: fy - (fy - cur.y) * ratio });
    });

  const rect = () => vp.current!.getBoundingClientRect();

  return (
    <div className="hintmap-ov" onClick={ctrl.closeHintMap}>
      <div className="hintmap-card" onClick={(e) => e.stopPropagation()}>
        <div className="hintmap-head">
          <div>
            <div className="hintmap-ttl">Indice — le plan</div>
            <div className="hintmap-sub">
              En <span className="hm-red">rouge</span>, les stations qui cochent les deux critères.
              À toi de les reconnaître : pas de noms.
              {ring &&
                ` Le cercle pointillé trace la limite des ${ring.label} à vol d'oiseau autour de la Comédie.`}
            </div>
          </div>
          <button className="hintmap-x" onClick={ctrl.closeHintMap} aria-label="Fermer">
            ✕
          </button>
        </div>

        <div
          className="hintmap-view"
          ref={vp}
          onWheel={(e) => {
            const r = rect();
            zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.15 : 1 / 1.15);
          }}
          onPointerDown={(e) => {
            (e.target as Element).setPointerCapture?.(e.pointerId);
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          }}
          onPointerMove={(e) => {
            const p = pointers.current.get(e.pointerId);
            if (!p) return;
            const dx = e.clientX - p.x;
            const dy = e.clientY - p.y;
            p.x = e.clientX;
            p.y = e.clientY;
            const all = [...pointers.current.values()];
            if (all.length >= 2) {
              const [a, b] = all as [{ x: number; y: number }, { x: number; y: number }];
              const dist = Math.hypot(a.x - b.x, a.y - b.y);
              if (pinchDist.current) {
                const r = rect();
                zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, dist / pinchDist.current);
              }
              pinchDist.current = dist;
            } else {
              setT((cur) => fit({ ...cur, x: cur.x + dx, y: cur.y + dy }));
            }
          }}
          onPointerUp={(e) => {
            pointers.current.delete(e.pointerId);
            if (pointers.current.size < 2) pinchDist.current = null;
          }}
          onPointerCancel={(e) => {
            pointers.current.delete(e.pointerId);
            if (pointers.current.size < 2) pinchDist.current = null;
          }}
        >
          <div
            className="hintmap-canvas"
            style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.k})` }}
          >
            <svg viewBox={`0 0 ${mapGeo.width} ${mapGeo.height}`} width="100%" style={{ display: "block" }}>
              {mapGeo.tracks.map((t, i) => (
                <path
                  key={i}
                  d={t.d}
                  fill="none"
                  stroke={t.color}
                  strokeWidth={4.5 * iz}
                  strokeOpacity={0.82}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}
              {ring && (
                <g>
                  <circle
                    cx={comedie.x}
                    cy={comedie.y}
                    r={ring.meters * mapGeo.pxPerMeter}
                    fill="none"
                    stroke="var(--ink)"
                    strokeOpacity={0.55}
                    strokeWidth={2.5 * iz}
                    strokeDasharray={`${9 * iz} ${7 * iz}`}
                  />
                  <text
                    x={comedie.x}
                    y={comedie.y - ring.meters * mapGeo.pxPerMeter - 9 * iz}
                    textAnchor="middle"
                    fontSize={16 * iz}
                    fontWeight={800}
                    fill="var(--ink)"
                    stroke="var(--paper)"
                    strokeWidth={4 * iz}
                    paintOrder="stroke"
                  >
                    {ring.label}
                  </text>
                </g>
              )}
              {mapGeo.points
                .filter((p) => !valid.has(p.id))
                .map((p) => (
                  <circle key={p.id} cx={p.x} cy={p.y} r={6.5 * iz} fill="#b7b2a3" />
                ))}
              {mapGeo.points
                .filter((p) => valid.has(p.id))
                .map((p) => (
                  <g key={p.id}>
                    <circle cx={p.x} cy={p.y} r={20 * iz} fill="#e5352b" fillOpacity={0.14} />
                    <circle cx={p.x} cy={p.y} r={20 * iz} fill="none" stroke="#e5352b" strokeWidth={4.5 * iz} />
                    <circle cx={p.x} cy={p.y} r={9.5 * iz} fill="#e5352b" />
                  </g>
                ))}
            </svg>
          </div>

          <div className="hintmap-zoom">
            <button onClick={() => zoomAt(rect().width / 2, rect().height / 2, 1.4)} aria-label="Zoomer">
              +
            </button>
            <button onClick={() => zoomAt(rect().width / 2, rect().height / 2, 1 / 1.4)} aria-label="Dézoomer">
              −
            </button>
          </div>
        </div>

        <button className="hintmap-done" onClick={ctrl.closeHintMap}>
          J'ai vu — je cherche
        </button>
      </div>
    </div>
  );
}
