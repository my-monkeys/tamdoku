// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { applyRouteMeta } from "../src/seo.ts";

// applyRouteMeta lit les balises réelles du <head> (comme index.html) et les met à jour.
beforeEach(() => {
  document.head.innerHTML = `
    <meta name="description" content="" />
    <meta name="robots" content="" />
    <link rel="canonical" href="" />
    <meta property="og:title" content="" />
    <meta property="og:description" content="" />
    <meta property="og:url" content="" />
  `;
});

const desc = () => document.querySelector('meta[name="description"]')!.getAttribute("content")!;
const canonical = () => document.querySelector('link[rel="canonical"]')!.getAttribute("href")!;
const robots = () => document.querySelector('meta[name="robots"]')!.getAttribute("content")!;

describe("applyRouteMeta", () => {
  it("home : title + canonical racine, indexable", () => {
    applyRouteMeta("home", "daily", "2026-07-12");
    expect(document.title).toContain("puzzle quotidien du tram de Montpellier");
    expect(canonical()).toBe("https://tamdoku.fr/");
    expect(robots()).toContain("index");
    expect(robots()).not.toContain("noindex");
  });

  it("chaque écran a son title + son URL canonique distincts", () => {
    applyRouteMeta("rules", "daily", "2026-07-12");
    expect(document.title).toContain("Comment jouer");
    expect(canonical()).toBe("https://tamdoku.fr/regles");

    applyRouteMeta("about", "daily", "2026-07-12");
    expect(document.title).toContain("À propos");
    expect(canonical()).toBe("https://tamdoku.fr/a-propos");
    expect(desc()).toContain("UbahnDoku");

    applyRouteMeta("archive", "daily", "2026-07-12");
    expect(document.title).toContain("Archive");
    expect(canonical()).toBe("https://tamdoku.fr/archive");
  });

  it("grille datée : partageable mais noindex, jamais canonique vers /", () => {
    applyRouteMeta("game", "archive", "2026-07-03");
    expect(document.title).toContain("2026-07-03");
    expect(robots()).toContain("noindex");
    expect(canonical()).toBe("https://tamdoku.fr/archive/2026-07-03");
  });

  it("og:title et og:url suivent l'écran", () => {
    applyRouteMeta("rules", "daily", "2026-07-12");
    expect(document.querySelector('meta[property="og:url"]')!.getAttribute("content")).toBe(
      "https://tamdoku.fr/regles",
    );
    expect(document.querySelector('meta[property="og:title"]')!.getAttribute("content")).toContain(
      "Comment jouer",
    );
  });
});
