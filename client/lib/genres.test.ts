import { describe, it, expect } from "vitest";
import { DEFAULT_GENRES, type Book } from "./books";
import { knownGenres } from "./genres";
import type { Series } from "./series";

function bookWith(genres: string[]) {
  return { genres } as Book;
}

function seriesWith(genres: string[]) {
  return { genres } as Series;
}

describe("knownGenres", () => {
  it("offers the usual genres in their own order when nothing else is used", () => {
    expect(knownGenres([], [], [])).toEqual(DEFAULT_GENRES);
  });

  it("adds the genres of the user's books and series after the usual ones, once each and sorted", () => {
    const result = knownGenres(
      [bookWith(["Litrpg", "Fantasy"]), bookWith(["Cosy mystery"])],
      [seriesWith(["Litrpg", "Biography"])],
      [],
    );

    expect(result.slice(0, DEFAULT_GENRES.length)).toEqual(DEFAULT_GENRES);
    expect(result.slice(DEFAULT_GENRES.length)).toEqual(["Biography", "Cosy mystery", "Litrpg"]);
  });

  it("does not list a genre twice because of its letter case", () => {
    const result = knownGenres(
      [bookWith(["fantasy", "cosy mystery"]), bookWith(["Cosy Mystery"])],
      [],
      [],
    );

    expect(result.filter((name) => name.toLowerCase() === "fantasy")).toEqual(["Fantasy"]);
    expect(result.filter((name) => name.toLowerCase() === "cosy mystery")).toEqual([
      "cosy mystery",
    ]);
  });

  it("keeps a genre that was chosen but is not saved anywhere yet", () => {
    const result = knownGenres([], [], ["Manga"]);

    expect(result.at(-1)).toBe("Manga");
  });
});
