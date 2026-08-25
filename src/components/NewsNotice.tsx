import { useState } from "react";
import { lsGet, lsSet } from "../storage.ts";
import { todayStr } from "../format.ts";
import { usePopIn } from "../usePopIn.ts";

/** Dernier jour (inclus) d'affichage de l'annonce. */
const NOTICE_UNTIL = "2026-09-07";
/** Clé versionnée par salve d'annonce : nouvelle salve = nouvelle clé. */
const NOTICE_KEY = "newsSeen:2026-08-27-bustram";

/**
 * Annonce one-shot de l'arrivée du Bustram A (idée d'un joueur conducteur de TER,
 * retour du 23/08/2026 — le remerciement reprend ses propres mots, sans le nommer).
 * Aucun nom de station : les six nouvelles sont autant de réponses à trouver.
 * À remplacer par la salve suivante — ou à retirer — après le 07/09.
 */
export function NewsNotice() {
  const [seen, setSeen] = useState(() => lsGet(NOTICE_KEY, false));
  const card = usePopIn<HTMLDivElement>([seen]);
  if (seen || todayStr() > NOTICE_UNTIL) return null;

  const dismiss = () => {
    lsSet(NOTICE_KEY, true);
    setSeen(true);
  };

  return (
    <div className="ov" onClick={dismiss}>
      <div className="infocard" ref={card} onClick={(e) => e.stopPropagation()}>
        <div className="infochip" style={{ gap: 8 }}>
          <span className="rd mini vA" style={{ width: 48, height: 48, fontSize: 22 }}>
            A
          </span>
        </div>
        <div className="infotitle">Le Bustram A rejoint le réseau</div>
        {/* Paragraphes longs : le centrage hérité d'.infocard rend la lecture
            pénible, on aligne à gauche (titre et pastille restent centrés). */}
        <div className="infotext" style={{ textAlign: "left" }}>
          À partir des grilles du <b>27 août</b>, le <b>Bustram A</b> compte comme une sixième
          ligne : un critère « Sur la ligne A » peut sortir, et six stations de plus entrent dans le
          jeu.
          <br />
          <br />
          Il compte <b>comme les tramways</b> : il crée une correspondance là où il en croise un, et
          ses deux bouts sont des terminus.
          <br />
          <br />
          <b>Les grilles d&rsquo;avant ne changent pas</b> — ni leurs critères, ni leurs solutions.
          L&rsquo;archive se joue sur le réseau de sa date.
          <br />
          <br />
          L&rsquo;idée vient d&rsquo;un retour de joueur&nbsp;: un <b>conducteur de TER</b> en Occitanie,
          qui connaît les lignes par cœur et trouvait dommage que le Bustram manque à l&rsquo;appel.
          Merci beaucoup&nbsp;! Continuez d&rsquo;écrire&nbsp;: vos retours font le jeu.
        </div>
        <button className="obtn" onClick={dismiss}>
          Compris
        </button>
      </div>
    </div>
  );
}
