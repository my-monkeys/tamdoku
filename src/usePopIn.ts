import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

/**
 * Entrée « pop » (scale + fade) d'une carte de modal. Renvoie la ref à poser dessus.
 * `deps` : passer l'état d'ouverture quand le composant reste monté et rend `null`
 * une fois fermé (l'anim se rejoue à chaque ouverture).
 */
export function usePopIn<T extends HTMLElement = HTMLDivElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null);
  useGSAP(
    () => {
      if (ref.current) {
        gsap.from(ref.current, { scale: 0.9, opacity: 0, y: 14, duration: 0.34, ease: "back.out(1.6)" });
      }
    },
    { scope: ref, dependencies: deps },
  );
  return ref;
}
