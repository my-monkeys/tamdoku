/**
 * Matching biparti (Kuhn) : vérifie qu'on peut remplir les 9 cases avec
 * 9 stations toutes distinctes — la contrainte « une station ne sert qu'une fois »
 * d'une partie parfaite.
 */
export function hasPerfectAssignment(cellCandidates: ReadonlySet<string>[]): boolean {
  return maxAssignment(cellCandidates) === cellCandidates.length;
}

/** Taille maximale d'une affectation cases → stations distinctes. */
export function maxAssignment(cellCandidates: ReadonlySet<string>[]): number {
  const stationIds = new Set<string>();
  for (const set of cellCandidates) for (const id of set) stationIds.add(id);
  const stationIndex = new Map<string, number>();
  for (const id of stationIds) stationIndex.set(id, stationIndex.size);

  const adj: number[][] = cellCandidates.map((set) =>
    [...set].map((id) => stationIndex.get(id)!),
  );
  const matchOfStation = new Array<number>(stationIndex.size).fill(-1);

  const tryAssign = (cell: number, visited: boolean[]): boolean => {
    for (const st of adj[cell]!) {
      if (visited[st]) continue;
      visited[st] = true;
      if (matchOfStation[st] === -1 || tryAssign(matchOfStation[st]!, visited)) {
        matchOfStation[st] = cell;
        return true;
      }
    }
    return false;
  };

  let matched = 0;
  for (let cell = 0; cell < cellCandidates.length; cell++) {
    if (tryAssign(cell, new Array(stationIndex.size).fill(false))) matched++;
  }
  return matched;
}

/**
 * Complète une grille pour l'affichage des réponses : garde les stations déjà
 * placées, et pour chaque case vide prend la **première** station valide encore
 * libre (candidats triés, jamais deux fois la même). Renvoie 9 ids (null si une
 * case n'a pas pu être remplie — cas rare).
 */
export function revealGrid(
  cellCandidates: ReadonlySet<string>[],
  placed: (string | null)[],
): (string | null)[] {
  const used = new Set(placed.filter(Boolean) as string[]);
  const result = placed.slice();
  for (let cell = 0; cell < cellCandidates.length; cell++) {
    if (result[cell]) continue;
    for (const station of cellCandidates[cell]!) {
      if (!used.has(station)) {
        result[cell] = station;
        used.add(station);
        break;
      }
    }
  }
  return result;
}
