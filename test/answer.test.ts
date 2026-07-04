import { describe, expect, it } from "vitest";
import { findStation, matchesStation, suggestStations } from "../engine/answer.ts";
import { loadNetwork, stationById } from "../engine/network.ts";

const net = loadNetwork();
const byId = stationById(net);

describe("correspondance des réponses", () => {
  it("insensible casse/accents/ponctuation", () => {
    expect(matchesStation("gare saint roch", byId.get("gare-saint-roch")!)).toBe(true);
    expect(matchesStation("SAINT-ELOI", byId.get("saint-eloi")!)).toBe(true);
    expect(matchesStation("chateau d o", byId.get("chateau-d-o")!)).toBe(true);
  });

  it("les alias comptent (GTFS, quais directionnels, noms courts)", () => {
    expect(matchesStation("Gambetta - Chaptal", byId.get("gambetta")!)).toBe(true);
    expect(matchesStation("Louis Blanc", byId.get("louis-blanc-agora-de-la-danse")!)).toBe(true);
    expect(matchesStation("Occitanie", byId.get("occitanie-hopitaux-facultes")!)).toBe(true);
    expect(matchesStation("Saint-Martin", byId.get("saint-martin-le-jam")!)).toBe(true);
  });

  it("« Gare Saint-Roch » ne matche pas la station République (et réciproquement)", () => {
    expect(findStation("Gare Saint-Roch", net.stations)?.id).toBe("gare-saint-roch");
    expect(findStation("Gare Saint-Roch République", net.stations)?.id).toBe(
      "gare-saint-roch-republique",
    );
  });

  it("« Albert 1er » seul reste ambigu → aucun match", () => {
    expect(findStation("Albert 1er", net.stations)).toBeUndefined();
  });

  it("suggestions par préfixe", () => {
    const names = suggestStations("saint", net.stations, 20).map((s) => s.id);
    expect(names).toContain("saint-eloi");
    expect(names).toContain("saint-lazare");
    expect(suggestStations("x", net.stations)).toEqual([]);
  });
});
