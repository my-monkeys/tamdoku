import { useMemo } from "react";
import { network, byId } from "../data.ts";
import type { LineRef } from "../../engine/types.ts";
import type { useGame } from "../useGame.ts";

// Couleurs officielles TaM (identiques aux pastilles .v1..v5).
const LINE_COLORS: Record<LineRef, string> = {
  "1": "#0059A2",
  "2": "#EF7D00",
  "3": "#C6D302",
  "4": "#4C2B0E",
  "5": "#287530",
};

const GAP = 38; // écart horizontal entre stations
const PADX = 46; // marge de départ (dégage le badge en haut-gauche)

// Bande simple
const SIMPLE_H = 185;
const S_DOT_B = 26;
const S_NAME_B = 44;

// Bande à fourche (L3) : rail secondaire juste sous le principal (bifurcation
// arrondie), et noms de la 2ᵉ branche EN DESSOUS pour rester compact.
const FORK_H = 240;
const MAIN_C = 120; // centre du rail principal (depuis le bas)
const LOW_C = 88; // centre du rail secondaire
const dotB = (center: number) => center - 6.5;
const nameAboveB = (center: number) => center + 9.5; // bottom d'un nom au-dessus
const nameBelowT = (center: number) => FORK_H - (center - 6.5) + 3; // top d'un nom en dessous

type Simple = { kind: "line"; ref: LineRef; color: string; stations: string[] };
type Fork = { kind: "fork"; ref: LineRef; color: string; trunk: string[]; tailA: string[]; tailB: string[] };
type Strip = Simple | Fork;

const toNames = (ids: string[]) => ids.map((id) => byId.get(id)?.name ?? id);

/**
 * Chaque ligne dépliée « à plat » (façon plan de tram). Les branches partageant
 * les mêmes terminus sont dédupliquées (L5). Une ligne à deux vraies branches
 * (L3 : Lattes / Pérols) est fusionnée : tronc commun une fois, puis fourche.
 * La boucle L4 est ouverte. Aucune info en plus : juste le nom.
 */
function buildStrips(): Strip[] {
  const out: Strip[] = [];
  for (const line of network.lines) {
    const uniq: string[][] = [];
    const seen = new Set<string>();
    for (const br of [...line.branches].sort((a, b) => b.length - a.length)) {
      let ids = br;
      if (line.circular && ids.length > 1 && ids[0] === ids[ids.length - 1]) ids = ids.slice(0, -1);
      const key = `${ids[0]}|${ids[ids.length - 1]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push(ids);
    }
    const color = LINE_COLORS[line.ref];
    if (uniq.length === 2) {
      const a = uniq[0]!;
      const b = uniq[1]!;
      let k = 0;
      while (k < a.length && k < b.length && a[k] === b[k]) k++;
      if (k > 0 && k < a.length && k < b.length) {
        out.push({ kind: "fork", ref: line.ref, color, trunk: toNames(a.slice(0, k)), tailA: toNames(a.slice(k)), tailB: toNames(b.slice(k)) });
        continue;
      }
    }
    for (const ids of uniq) out.push({ kind: "line", ref: line.ref, color, stations: toNames(ids) });
  }
  return out;
}

function Stop({ x, name, color, dotBottom, nameBottom, nameTop }: { x: number; name: string; color: string; dotBottom: number; nameBottom?: number; nameTop?: number }) {
  return (
    <div className="lines-stop" style={{ left: x }}>
      <span className={nameTop != null ? "lines-name below" : "lines-name"} style={nameTop != null ? { top: nameTop } : { bottom: nameBottom }}>
        {name}
      </span>
      <span className="lines-dot" style={{ bottom: dotBottom, borderColor: color }} />
    </div>
  );
}

function SimpleStrip({ s }: { s: Simple }) {
  const width = PADX * 2 + (s.stations.length - 1) * GAP;
  return (
    <div className="lines-scroll">
      <div className="lines-track" style={{ width, height: SIMPLE_H }}>
        <div className="lines-rail" style={{ background: s.color, bottom: S_DOT_B + 3 }} />
        {s.stations.map((name, i) => (
          <Stop key={i} x={PADX + i * GAP} name={name} dotBottom={S_DOT_B} nameBottom={S_NAME_B} color={s.color} />
        ))}
        {/* rail dessiné en div (bande simple) */}
      </div>
    </div>
  );
}

function ForkStrip({ s }: { s: Fork }) {
  const nT = s.trunk.length;
  const main = [...s.trunk, ...s.tailA]; // tronc + branche du haut (rail principal)
  const cols = nT - 1 + Math.max(s.tailA.length, s.tailB.length);
  const width = PADX * 2 + cols * GAP;
  const xOf = (i: number) => PADX + i * GAP;
  const mainY = FORK_H - MAIN_C; // en coordonnées SVG (origine en haut)
  const lowY = FORK_H - LOW_C;
  const forkX = xOf(nT - 1);
  const branchX = xOf(nT);
  // Bifurcation arrondie : cubique horizontale→horizontale du rail principal au secondaire.
  const curve = `M ${forkX} ${mainY} C ${forkX + GAP * 0.6} ${mainY}, ${branchX - GAP * 0.6} ${lowY}, ${branchX} ${lowY}`;

  return (
    <div className="lines-scroll">
      <div className="lines-track" style={{ width, height: FORK_H }}>
        <svg className="lines-svg" width={width} height={FORK_H}>
          <line x1={0} y1={mainY} x2={xOf(main.length - 1)} y2={mainY} stroke={s.color} strokeWidth={6} strokeLinecap="round" />
          <path d={curve} fill="none" stroke={s.color} strokeWidth={6} strokeLinecap="round" />
          <line x1={branchX} y1={lowY} x2={xOf(nT + s.tailB.length - 1)} y2={lowY} stroke={s.color} strokeWidth={6} strokeLinecap="round" />
        </svg>
        {main.map((name, i) => (
          <Stop key={`m${i}`} x={xOf(i)} name={name} dotBottom={dotB(MAIN_C)} nameBottom={nameAboveB(MAIN_C)} color={s.color} />
        ))}
        {s.tailB.map((name, j) => (
          <Stop key={`b${j}`} x={xOf(nT + j)} name={name} dotBottom={dotB(LOW_C)} nameTop={nameBelowT(LOW_C)} color={s.color} />
        ))}
      </div>
    </div>
  );
}

export function LinesOverlay({ ctrl }: { ctrl: ReturnType<typeof useGame> }) {
  const { g } = ctrl;
  const strips = useMemo(buildStrips, []);
  if (!g.linesOpen) return null;

  return (
    <div className="lines-ov" onClick={ctrl.closeLines}>
      <div className="lines-card" onClick={(e) => e.stopPropagation()}>
        <div className="lines-head">
          <div>
            <div className="lines-ttl">Les lignes du réseau</div>
            <div className="lines-sub">Chaque ligne dépliée, station par station. Fais défiler horizontalement.</div>
          </div>
          <button className="lines-x" onClick={ctrl.closeLines} aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className="lines-body">
          {strips.map((s, i) => (
            <div className="lines-row" key={`${s.ref}-${i}`}>
              <span className={`rd v${s.ref} lines-badge`}>{s.ref}</span>
              {s.kind === "fork" ? <ForkStrip s={s} /> : <SimpleStrip s={s} />}
            </div>
          ))}
        </div>

        <button className="lines-done" onClick={ctrl.closeLines}>
          Fermer
        </button>
      </div>
    </div>
  );
}
