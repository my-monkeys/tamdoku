/**
 * Palette des lignes, celle de l'app (pastilles .v1….v5, .vA) — pas celle de
 * network.json, dont la couleur vient du GTFS et manque sur certaines lignes.
 * Partagée par le plan-indice, le diagramme des lignes et sa légende.
 */
import type { LineRef } from "../engine/types.ts";

export const LINE_COLORS: Record<LineRef, string> = {
  "1": "#0059a2",
  "2": "#ef7d00",
  "3": "#c6d302",
  "4": "#4c2b0e",
  "5": "#287530",
  A: "#841931",
};
