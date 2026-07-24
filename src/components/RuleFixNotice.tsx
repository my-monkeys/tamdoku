import { useState } from "react";
import { lsGet, lsSet } from "../storage.ts";
import { todayStr } from "../format.ts";
import { usePopIn } from "../usePopIn.ts";
import { Icon } from "./icons.tsx";

/** Dernier jour (inclus) d'affichage de l'annonce de correction. */
const NOTICE_UNTIL = "2026-07-25";
/** Clé versionnée : l'ajout de la correction « Personnalité » (24/07) re-montre
 * la modale une fois, y compris à ceux qui avaient fermé la version du 23/07. */
const NOTICE_KEY = "ruleFixSeen:2026-07-24";

/**
 * Annonce one-shot des corrections de règles de juillet 2026 (« lettre doublée »
 * par mot, « nom propre » → « personnalité ») : des grilles ont changé, on
 * prévient plutôt que de laisser croire à un bug. Pas de nom de station dans le
 * texte — les stations corrigées sont des solutions de la grille du 24/07.
 * À retirer du code après le 25/07 à la prochaine release.
 */
export function RuleFixNotice() {
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
          <span
            className="rd mini"
            style={{ width: 48, height: 48, fontSize: 20, background: "var(--soft)", color: "var(--ink)" }}
          >
            aa
          </span>
          <span
            className="rd mini"
            style={{ width: 48, height: 48, background: "var(--soft)", color: "var(--ink)" }}
          >
            <Icon name="user" size={24} />
          </span>
        </div>
        <div className="infotitle">Deux règles corrigées</div>
        <div className="infotext">
          Merci pour vos retours ! <b>Lettre doublée</b> : les deux lettres identiques doivent se
          suivre <b>à l'intérieur d'un même mot</b> (ll, ss, nn…) — celles qui se touchaient à la
          jonction de deux mots ne comptent plus.
          <br />
          <br />
          <b>« Nom propre » devient « Personnalité »</b> : la station porte le nom d'une personne
          réelle, même dans un nom composé (université, stade, parc…). Quelques stations oubliées
          comptent désormais — dont celles que vous nous avez signalées. Les saints, eux, ne
          comptent toujours pas.
          <br />
          <br />
          Au passage, quelques grilles ont changé — si une partie en cours a été chamboulée,
          désolé, c'est pour la bonne cause.
        </div>
        <button className="obtn" onClick={dismiss}>
          Compris
        </button>
      </div>
    </div>
  );
}
