import { describe, expect, it } from "vitest";
import {
  fold,
  hasDoubleLetter,
  hasDoubleLetterInWord,
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

  it("détecte les doubles lettres à travers la ponctuation mais pas les faux positifs (legacy)", () => {
    expect(hasDoubleLetter("Mosson")).toBe(true);
    expect(hasDoubleLetter("Tonnelles")).toBe(true);
    expect(hasDoubleLetter("Corum")).toBe(false);
    // La jonction de deux mots comptait — la source de la confusion des joueurs.
    expect(hasDoubleLetter("Plan des 4 Seigneurs")).toBe(true);
    expect(hasDoubleLetter("Parc Clemenceau")).toBe(true);
  });

  it("la définition par mot ignore les jonctions entre mots", () => {
    expect(hasDoubleLetterInWord("Mosson")).toBe(true);
    expect(hasDoubleLetterInWord("Tonnelles")).toBe(true);
    expect(hasDoubleLetterInWord("Corum")).toBe(false);
    expect(hasDoubleLetterInWord("Plan des 4 Seigneurs")).toBe(false);
    expect(hasDoubleLetterInWord("Parc Clemenceau")).toBe(false);
    expect(hasDoubleLetterInWord("Hôpital Lapeyronie")).toBe(false);
    expect(hasDoubleLetterInWord("Gare Sud de France")).toBe(false);
    // Deux lettres identiques non adjacentes ne comptent toujours pas.
    expect(hasDoubleLetterInWord("Nouveau Saint-Roch")).toBe(false);
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
