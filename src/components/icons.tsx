import type { ReactNode } from "react";
import type { Criterion } from "../../engine/criteria.ts";

/** Jeu d'icônes en trait fin (24×24, currentColor), cohérent avec l'esthétique
 * éditoriale du jeu. Remplace les glyphes Unicode, qui rendaient mal selon la police. */
const PATHS: Record<string, ReactNode> = {
  swap: (
    <>
      <path d="M4 8h16" />
      <path d="m16 4 4 4-4 4" />
      <path d="M20 16H4" />
      <path d="m8 12-4 4 4 4" />
    </>
  ),
  terminus: (
    <>
      <path d="M5 4v16" />
      <path d="M20 12H10" />
      <path d="m14 8-4 4 4 4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  tree: (
    <>
      <path d="M12 3 6 12h3l-3 5h12l-3-5h3z" />
      <path d="M12 17v4" />
    </>
  ),
  cap: (
    <>
      <path d="m2 9 10-4 10 4-10 4z" />
      <path d="M6 11v4c0 1.3 2.7 2.5 6 2.5s6-1.2 6-2.5v-4" />
    </>
  ),
  building: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1" />
      <path d="M10 21v-4h4v4" />
      <path d="M9 7h1M14 7h1M9 11h1M14 11h1" />
    </>
  ),
  signpost: (
    <>
      <path d="M12 2v20" />
      <path d="M12 5h6l2.5 2.5L18 10h-6" />
      <path d="M12 12H6l-2.5 2.5L6 17h6" />
    </>
  ),
  arrowUp: (
    <>
      <path d="M12 20V5" />
      <path d="m6 11 6-6 6 6" />
    </>
  ),
  arrowDown: (
    <>
      <path d="M12 4v15" />
      <path d="m6 13 6 6 6-6" />
    </>
  ),
  arrowLeft: (
    <>
      <path d="M20 12H5" />
      <path d="m11 6-6 6 6 6" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  expand: (
    <>
      <path d="M4 9V4h5" />
      <path d="M20 9V4h-5" />
      <path d="M4 15v5h5" />
      <path d="M20 15v5h-5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  hash: (
    <>
      <path d="M5 9h14M4 15h14M10 4 8 20M16 4l-2 16" />
    </>
  ),
  back: <path d="m15 5-7 7 7 7" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.2 9.3a2.8 2.8 0 0 1 5.4 1c0 1.9-2.6 2.2-2.6 4" />
      <path d="M12 17.5h.01" />
    </>
  ),
};

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const path = PATHS[name];
  if (!path) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}

/**
 * Symbole d'un critère : icône SVG pour les critères conceptuels (correspondance,
 * terminus, géographie…), texte pour les critères typographiques dont la marque
 * EST le critère (la lettre « B », « St », « 18+ »…).
 */
export function CritGlyph({ crit, size = 18 }: { crit: Criterion; size?: number }) {
  return crit.iconKey ? <Icon name={crit.iconKey} size={size} /> : <>{crit.icon}</>;
}

/** Un critère a-t-il un symbole à afficher (icône SVG ou marque typographique) ? */
export function hasGlyph(crit: Criterion): boolean {
  return Boolean(crit.iconKey || crit.icon);
}
