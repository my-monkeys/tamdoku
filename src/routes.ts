/**
 * Correspondance URL ↔ écran. Le jeu du jour reste sur « / » (pas d'URL dédiée) ;
 * tout le reste a une vraie route, et les grilles passées ont une URL partageable
 * `/archive/AAAA-MM-JJ`.
 */
export type Route =
  | { name: "home" }
  | { name: "archive" }
  | { name: "rules" }
  | { name: "stats" }
  | { name: "about" }
  | { name: "grid"; date: string };

export function parsePath(pathname: string): Route {
  const p = pathname.replace(/\/+$/, "");
  if (p === "") return { name: "home" };
  if (p === "/archive") return { name: "archive" };
  if (p === "/regles") return { name: "rules" };
  if (p === "/stats") return { name: "stats" };
  if (p === "/a-propos") return { name: "about" };
  const match = /^\/archive\/(\d{4}-\d{2}-\d{2})$/.exec(p);
  if (match) return { name: "grid", date: match[1]! };
  return { name: "home" };
}

/** URL correspondant à l'état courant (screen/game/date). */
export function pathFor(screen: string, game: string, puzzleDate: string): string {
  switch (screen) {
    case "archive":
      return "/archive";
    case "rules":
      return "/regles";
    case "stats":
      return "/stats";
    case "about":
      return "/a-propos";
    case "game":
      return game === "archive" ? `/archive/${puzzleDate}` : "/";
    default:
      return "/";
  }
}
