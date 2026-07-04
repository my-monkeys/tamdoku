import { describe, expect, it } from "vitest";
import {
  fold,
  hasDoubleLetter,
  letterCount,
  lettersOnly,
  slugify,
  startsWithVowel,
  words,
} from "../engine/text.ts";

describe("text", () => {
  it("plie accents et casse", () => {
    expect(fold("Saint-Éloi")).toBe("saint-eloi");
    expect(fold("Château d'Ô")).toBe("chateau d'o");
  });

  it("compte les lettres sans ponctuation", () => {
    expect(lettersOnly("Château d'Ô")).toBe("chateaudo");
    expect(letterCount("Mondial 98")).toBe(7);
  });

  it("découpe les mots sur espaces, tirets et apostrophes", () => {
    expect(words("Gare Saint-Roch - République")).toEqual(["Gare", "Saint", "Roch", "République"]);
    expect(words("Place de l'Europe")).toEqual(["Place", "de", "l", "Europe"]);
    expect(words("Comédie")).toEqual(["Comédie"]);
  });

  it("détecte les doubles lettres à travers la ponctuation mais pas les faux positifs", () => {
    expect(hasDoubleLetter("Mosson")).toBe(true);
    expect(hasDoubleLetter("Tonnelles")).toBe(true);
    expect(hasDoubleLetter("Corum")).toBe(false);
  });

  it("voyelle initiale", () => {
    expect(startsWithVowel("Odysseum")).toBe(true);
    expect(startsWithVowel("Écopôle")).toBe(true);
    expect(startsWithVowel("Comédie")).toBe(false);
  });

  it("slugifie de façon stable", () => {
    expect(slugify("Gare Saint-Roch - République")).toBe("gare-saint-roch-republique");
    expect(slugify("Moularès (Hôtel de Ville)")).toBe("moulares-hotel-de-ville");
    expect(slugify("Château d'Ô")).toBe("chateau-d-o");
  });
});
