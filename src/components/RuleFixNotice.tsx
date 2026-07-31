import { useState } from "react";
import { lsGet, lsSet } from "../storage.ts";
import { todayStr } from "../format.ts";
import { usePopIn } from "../usePopIn.ts";
import { Icon } from "./icons.tsx";

/** Dernier jour (inclus) d'affichage de l'annonce. */
const NOTICE_UNTIL = "2026-08-06";
/** Clé versionnée par salve d'annonce : nouvelle salve = nouvelle clé. */
const NOTICE_KEY = "ruleFixSeen:2026-07-31";

/**
 * Annonce one-shot des nouveautés de fin juillet 2026 : rejeu d'archive,
 * élargissement « Personnalité » (retour joueur) et critère « P+Tram » réservé
 * aux grilles à partir du 2 août. Pas de nom de station dans le texte — la
 * station corrigée est une solution de grilles passées et à venir.
 * À retirer du code après le 06/08 à la prochaine release.
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
            style={{ width: 48, height: 48, fontSize: 22, background: "var(--soft)", color: "var(--ink)" }}
          >
            ↻
          </span>
          <span
            className="rd mini"
            style={{ width: 48, height: 48, background: "var(--soft)", color: "var(--ink)" }}
          >
            <Icon name="user" size={24} />
          </span>
          <span
            className="rd mini"
            style={{ width: 48, height: 48, fontSize: 18, background: "var(--soft)", color: "var(--ink)" }}
          >
            P+
          </span>
        </div>
        <div className="infotitle">Du neuf sur Tamdoku</div>
        {/* Trois paragraphes longs : le centrage hérité d'.infocard rend la
            lecture pénible, on aligne à gauche (titre et pastilles restent centrés). */}
        <div className="infotext" style={{ textAlign: "left" }}>
          <b>Rejouer les grilles</b> : dans l&rsquo;Archive, une grille déjà terminée propose
          désormais « Rejouer cette grille ». Ton meilleur résultat est conservé — un rejeu raté
          n&rsquo;écrase rien.
          <br />
          <br />
          <b>Personnalité</b> : une station de la ligne 5 nommée d&rsquo;après un ancien maire de
          Montpellier manquait à la liste — corrigé, merci pour vos signalements ! Aucune grille ne
          change de critères, quelques-unes gagnent juste une solution de plus.
          <br />
          <br />
          <b>Nouveau critère « P+Tram »</b> : à partir des grilles du 2 août, un critère « Station
          avec P+Tram » (parking-relais) peut apparaître. Il ne concerne que les nouvelles grilles —
          celles d&rsquo;avant ne changent pas.
        </div>
        <button className="obtn" onClick={dismiss}>
          Compris
        </button>
      </div>
    </div>
  );
}
