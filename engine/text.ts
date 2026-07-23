/** Utilitaires de normalisation des noms de stations pour les règles « nom ». */

/** Minuscules sans diacritiques : "Saint-Éloi" → "saint-eloi". */
export function fold(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Lettres seules, sans espaces ni ponctuation : "Château d'Ô" → "chateaudo". */
export function lettersOnly(name: string): string {
  return fold(name).replace(/[^a-z]/g, "");
}

/** Découpe en mots (séparateurs : espaces, tirets, apostrophes, parenthèses). */
export function words(name: string): string[] {
  return name.split(/[\s\-'’()]+/).filter(Boolean);
}

/** Nombre de lettres (hors espaces et ponctuation). */
export function letterCount(name: string): number {
  return lettersOnly(name).length;
}

export function containsLetter(name: string, letter: string): boolean {
  return lettersOnly(name).includes(letter.toLowerCase());
}

/**
 * Double lettre consécutive identique au sein d'un même mot : "Tonnelles", "Mosson".
 * Surtout pas sur le nom entier recollé : "Parc Clemenceau" matcherait via le c‿C
 * de la jonction, ce que les joueurs lisaient comme un bug (corrigé en juillet 2026).
 */
export function hasDoubleLetterInWord(name: string): boolean {
  return words(name).some((w) => /(.)\1/.test(lettersOnly(w)));
}

export function hasDigit(name: string): boolean {
  return /\d/.test(name);
}

export function hasAccent(name: string): boolean {
  return name !== name.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function hasApostrophe(name: string): boolean {
  return /['’]/.test(name);
}

const VOWELS = new Set(["a", "e", "i", "o", "u", "y"]);

export function startsWithVowel(name: string): boolean {
  const first = lettersOnly(name)[0];
  return first !== undefined && VOWELS.has(first);
}

export function endsWithVowel(name: string): boolean {
  const letters = lettersOnly(name);
  const last = letters[letters.length - 1];
  return last !== undefined && VOWELS.has(last);
}

/** Slug stable pour identifiants : "Gare Saint-Roch - République" → "gare-saint-roch-republique". */
export function slugify(name: string): string {
  return fold(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
