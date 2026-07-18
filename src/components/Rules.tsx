import { criteria, pool } from "../data.ts";
import type { RuleFamily } from "../../engine/types.ts";
import type { useGame } from "../useGame.ts";
import { CritGlyph, Icon } from "./icons.tsx";

const FAMILY_ORDER: { family: RuleFamily; label: string }[] = [
  { family: "ligne", label: "Les lignes" },
  { family: "reseau", label: "Le réseau" },
  { family: "nom", label: "Le nom de la station" },
  { family: "semantique", label: "Le thème" },
  { family: "geo", label: "La géographie" },
];

const STEPS: { n: number; body: React.ReactNode }[] = [
  {
    n: 1,
    body: (
      <>
        Une grille <b>3×3</b> apparaît. Chaque <b>ligne</b> et chaque <b>colonne</b> possède un
        critère (une ligne de tram ou une catégorie).
      </>
    ),
  },
  {
    n: 2,
    body: (
      <>
        Remplis chaque case avec une <b>station du tram</b> qui respecte à la fois le critère de sa
        ligne <b>et</b> celui de sa colonne.
      </>
    ),
  },
  {
    n: 3,
    body: (
      <>
        Une station ne sert qu'<b>une seule fois</b>. Une fois validée, elle est <b>verrouillée</b>
        — mais tu peux la retirer en payant <b>un cœur</b> si tu es bloqué. Seules les lignes qui
        s'arrêtent vraiment à la station comptent.
      </>
    ),
  },
  {
    n: 4,
    body: (
      <>
        <b>3 cœurs</b> en Expert, <b>5</b> en Simple : chaque erreur (ou retrait) en coûte un. Zéro
        cœur = partie perdue.
      </>
    ),
  },
  {
    n: 5,
    body: (
      <>
        Score d'originalité jusqu'à <b>900</b> : chaque bonne case vaut <b>40 pts</b> + jusqu'à{" "}
        <b>60</b> selon la rareté de ta station parmi les réponses des joueurs. Bonus si tu es le
        tout premier à la tenter ; une case indicée ne rapporte rien ; −20 pts par erreur. À la
        fin, touche une case pour voir ce que les autres ont répondu.
      </>
    ),
  },
  {
    n: 6,
    body: (
      <>
        Touche un critère <b>?</b> pour lire son explication. Mode <b>Simple</b> : suggestions +
        nombre de réponses. Mode <b>Expert</b> : de mémoire.
      </>
    ),
  },
];

export function Rules({ ctrl }: { ctrl: ReturnType<typeof useGame> }) {
  return (
    <div className="screen">
      <div className="subhead">
        <button className="icbtn" onClick={ctrl.goBack} aria-label="Retour">
          <Icon name="back" size={22} />
        </button>
        <span className="subttl">Comment jouer</span>
      </div>
      <div className="sub">
        {STEPS.map((s) => (
          <div className="step" key={s.n}>
            <span className="stepn">{s.n}</span>
            <span className="steptx">{s.body}</span>
          </div>
        ))}

        <div className="klabel" style={{ color: "var(--muted)" }}>
          Tous les critères possibles
        </div>
        {FAMILY_ORDER.map(({ family, label }) => {
          const rules = pool.filter((r) => r.family === family);
          if (rules.length === 0) return null;
          return (
            <div className="card" key={family}>
              <div className="klabel" style={{ color: "var(--muted)", marginBottom: 6 }}>
                {label}
              </div>
              {rules.map((r) => {
                const c = criteria.get(r.id)!;
                return (
                  <div className="critline" key={r.id}>
                    {c.kind === "line" ? (
                      <span className={`rd mini ${c.valClass}`}>{c.n}</span>
                    ) : (
                      <span
                        className="rd mini"
                        style={{ background: "var(--soft)", color: "var(--ink)", fontSize: 15 }}
                      >
                        <CritGlyph crit={c} size={17} />
                      </span>
                    )}
                    <div style={{ flex: 1 }}>
                      <div className="critn">{c.label}</div>
                      <div className="critd">{c.expl}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        <button className="obtn" onClick={ctrl.goBack}>
          C'est parti
        </button>
      </div>
    </div>
  );
}
