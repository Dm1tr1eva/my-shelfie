import { describe, it, expect } from "vitest";
import { gapNumbersOf, highestNumberOf, ownedNumbersOf } from "./catalogue";
import type { Book, Ownership } from "./books";

let counter = 0;

function book(overrides: Partial<Book> & { title?: string } = {}): Book {
  counter += 1;
  return {
    id: `book-${counter}`,
    userId: "u1",
    title: `Book ${counter}`,
    author: "An author",
    status: "want",
    ownership: "owned" as Ownership,
    format: "paper",
    desire: "normal",
    ageRating: "none",
    genres: [],
    tropes: [],
    moods: [],
    quotes: [],
    links: [],
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("series numbers", () => {
  it("lists the owned numbers once each, in order", () => {
    const books = [
      book({ seriesNumber: 3 }),
      book({ seriesNumber: 1 }),
      book({ seriesNumber: 3 }),
      book({ seriesNumber: 2, ownership: "wanted" }),
      book(),
    ];

    expect(ownedNumbersOf(books)).toEqual([1, 3]);
  });

  it("finds the highest number among all linked books, owned or not", () => {
    const books = [book({ seriesNumber: 2 }), book({ seriesNumber: 5, ownership: "wanted" })];

    expect(highestNumberOf(books)).toBe(5);
  });

  it("calls a number below the highest owned one a gap when it is not owned", () => {
    const books = [
      book({ seriesNumber: 1 }),
      book({ seriesNumber: 3 }),
      book({ seriesNumber: 5 }),
      book({ seriesNumber: 4, ownership: "wanted" }),
    ];

    expect(gapNumbersOf(books)).toEqual([2, 4]);
  });

  it("agrees with the server that a whole number below an owned novella number is a gap", () => {
    const books = [book({ seriesNumber: 1 }), book({ seriesNumber: 2.5 })];

    expect(gapNumbersOf(books)).toEqual([2]);
  });

  it("counts a wanted novella below the highest owned number as a gap, but not one above it", () => {
    const books = [
      book({ seriesNumber: 1 }),
      book({ seriesNumber: 2 }),
      book({ seriesNumber: 3 }),
      book({ seriesNumber: 1.5, ownership: "wanted" }),
      book({ seriesNumber: 3.5, ownership: "wanted" }),
    ];

    expect(gapNumbersOf(books)).toEqual([1.5]);
  });

  it("has no gaps when you own the first books in a row, or only the first", () => {
    expect(gapNumbersOf([book({ seriesNumber: 1 }), book({ seriesNumber: 2 })])).toEqual([]);
    expect(gapNumbersOf([book({ seriesNumber: 1 })])).toEqual([]);
    expect(gapNumbersOf([])).toEqual([]);
  });
});
