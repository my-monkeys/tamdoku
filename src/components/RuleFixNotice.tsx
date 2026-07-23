import { useState } from "react";
import { lsGet, lsSet } from "../storage.ts";
import { todayStr } from "../format.ts";
import { usePopIn } from "../usePopIn.ts";

/** Dernier jour (inclus) d'affichage de l'annonce de correction. */
const NOTICE_UNTIL = "2026-07-25";

/**
 * Annonce one-shot de la correction de la règle « lettre doublée » (juillet 2026) :
 * la nouvelle définition a été appliquée partout, ce qui a changé la grille du
 * jour et quelques grilles d'archive — on prévient plutôt que de laisser croire
 * à un bug. À retirer du code après le 25/07 à la prochaine release.
 */
export function RuleFixNotice() {
  const [seen, setSeen] = useState(() => lsGet("doubleLetterFixSeen", false));
  const card = usePopIn<HTMLDivElement>([seen]);
  if (seen || todayStr() > NOTICE_UNTIL) return null;

  const dismiss = () => {
    lsSet("doubleLetterFixSeen", true);
    setSeen(true);
  };

  return (
    <div className="ov" onClick={dismiss}>
      <div className="infocard" ref={card} onClick={(e) => e.stopPropagation()}>
        <div className="infochip">
          <span
            className="rd mini"
            style={{ width: 48, height: 48, fontSize: 20, background: "var(--soft)", color: "var(--ink)" }}
          >
            aa
          </span>
        </div>
        <div className="infotitle">« Lettre doublée » corrigée</div>
        <div className="infotext">
          Merci pour vos retours ! Les deux lettres identiques doivent désormais se suivre{" "}
          <b>à l'intérieur d'un même mot</b> (ll, ss, nn…). Avant, deux lettres qui se touchaient à
          la jonction de deux mots comptaient aussi — déroutant, on est d'accord.
          <br />
          <br />
          Au passage, la grille du jour et quelques grilles de l'archive ont changé. Si ta partie
          était en cours, elle a pu être chamboulée — désolé, c'est pour la bonne cause.
        </div>
        <button className="obtn" onClick={dismiss}>
          Compris
        </button>
      </div>
    </div>
  );
}
