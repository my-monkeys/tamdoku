import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { criterion } from "../data.ts";
import { prettyDate } from "../format.ts";
import { lsGet, lsSet } from "../storage.ts";
import type { useGame } from "../useGame.ts";
import { Icon } from "./icons.tsx";

export function Home({ ctrl }: { ctrl: ReturnType<typeof useGame> }) {
  const { g } = ctrl;
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.from(".stack > *", { y: 18, opacity: 0, duration: 0.5, ease: "power3.out", stagger: 0.08 });
      gsap.from(".brand", { scale: 0.8, duration: 0.6, ease: "back.out(1.7)", delay: 0.05 });
    },
    { scope: root },
  );

  // Curseur glissant du sélecteur Simple / Expert.
  const seg = useRef<HTMLDivElement>(null);
  const segFirst = useRef(true);
  useGSAP(
    () => {
      const btns = seg.current?.querySelectorAll<HTMLElement>(".segb");
      const thumb = seg.current?.querySelector<HTMLElement>(".seg-thumb");
      if (!btns || !thumb) return;
      const active = btns[g.mode === "expert" ? 1 : 0]!;
      const to = { x: active.offsetLeft, width: active.offsetWidth };
      if (segFirst.current) {
        segFirst.current = false;
        gsap.set(thumb, to);
      } else {
        gsap.to(thumb, { ...to, duration: 0.42, ease: "back.out(1.7)" });
      }
    },
    { scope: seg, dependencies: [g.mode] },
  );
  const done = g.dailySave?.status === "won" || g.dailySave?.status === "lost";

  // Défi du jour fini + archive jamais ouverte → bulle animée vers le bouton Archive.
  const [archiveSeen, setArchiveSeen] = useState(() => lsGet("archiveTipSeen", false));
  const showArchiveTip = done && !archiveSeen;
  const openArchive = () => {
    lsSet("archiveTipSeen", true);
    setArchiveSeen(true);
    ctrl.goScreen("archive");
  };
  useGSAP(
    () => {
      if (!showArchiveTip) return;
      gsap.from(".archive-tip", { opacity: 0, y: -10, duration: 0.45, ease: "power2.out", delay: 0.7 });
      gsap.to(".archive-tip", { y: 5, duration: 0.85, ease: "sine.inOut", repeat: -1, yoyo: true, delay: 1.15 });
    },
    { scope: root, dependencies: [showArchiveTip] },
  );

  const chips = [...g.dailyPuzzle.rows, ...g.dailyPuzzle.cols].map(criterion);
  const title = done
    ? g.dailySave?.status === "won"
      ? "Défi réussi ✓"
      : "Défi terminé"
    : "La grille du jour";
  const sub = done
    ? `Score : ${g.dailySave?.result?.score ?? 0}/900 · ${g.dailySave?.result?.solved ?? 0}/9 cases`
    : "Une nouvelle grille, la même pour tout le monde. Trouve les 9 stations.";

  return (
    <div className="screen home" ref={root}>
      <div className="pad stack">
        <div className="brandrow">
          <div className="tagpill">Montpellier · TaM</div>
          <div className="brand">Tamdoku</div>
          <div className="dots">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={`dot v${n}`} />
            ))}
          </div>
          <div className="brandsub">La grille de stations du tram de Montpellier</div>
        </div>

        <div className="card daily">
          <div className="rail">
            {[1, 2, 3, 4, 5].map((n) => (
              <i key={n} className={`v${n}`} />
            ))}
          </div>
          <div className="dhead">
            <span className="klabel">Défi du jour</span>
            <span className="ddate">{prettyDate()}</span>
          </div>
          <div className="dtitle">{title}</div>
          <div className="dsub">{sub}</div>
          <div className="chiprow">
            {chips.map((c, i) => (
              <span className="chip" key={`${c.ruleId}-${i}`}>
                {c.kind === "line" && <span className={`rd ${c.valClass}`}>{c.n}</span>}
                {c.short}
              </span>
            ))}
          </div>
          <div className="seg" ref={seg}>
            <span className="seg-thumb" />
            <button
              className={`segb ${g.mode === "simple" ? "on" : ""}`}
              onClick={() => ctrl.setMode("simple")}
            >
              Simple<span className="sst">suggestions</span>
            </button>
            <button
              className={`segb ${g.mode === "expert" ? "on" : ""}`}
              onClick={() => ctrl.setMode("expert")}
            >
              Expert<span className="sst">de mémoire</span>
            </button>
          </div>
          <button className={`bigbtn ${done ? "done" : ""}`} onClick={ctrl.startDaily}>
            {done ? "Revoir mon résultat" : "Jouer le défi"}
          </button>
        </div>

        <button className="home-fb" onClick={ctrl.openFeedback}>
          <Icon name="message" size={17} />
          <span>Une idée, un bug, un retour&nbsp;?</span>
          <span className="home-fb-go">›</span>
        </button>

        <div className="teaser">
          <div className="tcell">
            <div className="tnum">{g.stats.played}</div>
            <div className="tlab">Parties</div>
          </div>
          <div className="tcell">
            <div className="tnum">{g.stats.bestScore}</div>
            <div className="tlab">Meilleur score</div>
          </div>
          <div className="tcell">
            <div className="tnum">{g.streak.current}</div>
            <div className="tlab">Série</div>
          </div>
        </div>

        <a
          className="xgame"
          href="https://dle.tamdoku.fr/?utm_source=tamdoku"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="xic">
            <i className="v1" />
            <i className="v3" />
            <i className="v2" />
            <i className="v4" />
          </span>
          <span className="xtxt">
            <span className="xname">Statiodle</span>
            <span className="xsub">Devine la station mystère du jour</span>
          </span>
          <span className="xgo">›</span>
        </a>
      </div>

      <div className="footlinks">
        <button className="flink" onClick={() => ctrl.goScreen("rules")}>
          Règles du jeu
        </button>
        <span className="flink-wrap">
          {showArchiveTip && <span className="archive-tip">Rejoue les grilles des jours précédents</span>}
          <button className="flink" onClick={openArchive}>
            Archive
          </button>
        </span>
        <button className="flink" onClick={() => ctrl.goScreen("stats")}>
          Statistiques
        </button>
        <button className="flink" onClick={() => ctrl.goScreen("about")}>
          À propos
        </button>
      </div>

      <div className="sitefoot">
        <div className="sitefoot-brand">Un projet My-Monkey 🍌</div>
        <div className="sitefoot-links">
          <a href="https://my-monkey.fr/?utm_source=tamdoku" target="_blank" rel="noopener noreferrer">
            my-monkey.fr
          </a>
          <span className="sitefoot-sep">·</span>
          <a href="https://games.my-monkey.fr/?utm_source=tamdoku" target="_blank" rel="noopener noreferrer">
            games.my-monkey.fr
          </a>
        </div>
      </div>
    </div>
  );
}
