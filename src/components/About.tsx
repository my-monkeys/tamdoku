import { lineSummaries } from "../data.ts";
import type { useGame } from "../useGame.ts";
import { Icon } from "./icons.tsx";

export function About({ ctrl }: { ctrl: ReturnType<typeof useGame> }) {
  return (
    <div className="screen">
      <div className="subhead">
        <button className="icbtn" onClick={ctrl.goHome} aria-label="Retour">
          <Icon name="back" size={22} />
        </button>
        <span className="subttl">À propos</span>
      </div>
      <div className="sub">
        <p className="prose">
          <b>Tamdoku</b> est un hommage ludique au réseau de tramway de Montpellier — la version
          montpelliéraine d'<span className="m">UbahnDoku</span>. Au lieu de chiffres, on joue avec
          les <b>stations</b> du réseau TaM.
        </p>
        <p className="prose">
          Depuis 2000, le tram de Montpellier est célèbre pour ses habillages d'artistes : les{" "}
          <b>hirondelles</b> de Garouste &amp; Bonetti (L1), les <b>fleurs</b> (L2), les univers de{" "}
          <b>Christian Lacroix</b> (L3, L4) et la <b>Feuille de Vie</b> de Barthélémy Toguo (L5).
        </p>
        <div className="card">
          {lineSummaries.map((l) => (
            <div className="elrow" key={l.n}>
              <span className={`rd mini ${l.valClass}`}>{l.n}</span>
              <div style={{ flex: 1 }}>
                <span className="elname">{l.name}</span> · <span className="elel">{l.term}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="prose m" style={{ fontSize: 12 }}>
          Projet non officiel, sans lien avec TaM. Réseau et correspondances d'après les données
          ouvertes OpenStreetMap et le GTFS TaM ; les couleurs approchent la charte à des fins
          ludiques.
        </p>
        <button className="obtn sec" onClick={ctrl.goHome}>
          Retour
        </button>
      </div>
    </div>
  );
}
