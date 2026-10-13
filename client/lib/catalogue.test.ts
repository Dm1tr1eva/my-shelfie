import { describe, it, expect } from "vitest";
import {
  buildLibraryView,
  gapNumbersOf,
  highestNumberOf,
  ownedNumbersOf,
  shelfStats,
} from "./catalogue";
import type { Book, Ownership } from "./books";
import type { Series } from "./series";

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
    genres: [],
    tropes: [],
    links: [],
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

function series(overrides: Partial<Series> = {}): Series {
  counter += 1;
  return {
    id: `series-${counter}`,
    title: `Series ${counter}`,
    status: "ongoing",
    ownedCount: 0,
    wantedCount: 0,
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

describe("library view", () => {
  it("groups owned books by series, in title order, with standalone books last", () => {
    const zed = series({ title: "Zed" });
    const apple = series({ title: "Apple" });
    const books = [
      book({ title: "Zed 1", seriesId: zed.id, seriesNumber: 1 }),
      book({ title: "Apple 1", seriesId: apple.id, seriesNumber: 1 }),
      book({ title: "Alone" }),
    ];

    const view = buildLibraryView(books, [zed, apple], "library");

    expect(view.groups.map((group) => group.series.title)).toEqual(["Apple", "Zed"]);
    expect(view.standalone.map((item) => item.title)).toEqual(["Alone"]);
  });

  it("draws a gap slot between owned books, with the wishlist book that fills it", () => {
    const saga = series({ title: "Saga" });
    const books = [
      book({ title: "One", seriesId: saga.id, seriesNumber: 1 }),
      book({ title: "Three", seriesId: saga.id, seriesNumber: 3 }),
      book({ title: "Two", seriesId: saga.id, seriesNumber: 2, ownership: "wanted" }),
    ];

    const [group] = buildLibraryView(books, [saga], "library").groups;

    expect(
      group.slots.map((slot) => (slot.kind === "gap" ? `gap ${slot.number}` : slot.book.title)),
    ).toEqual(["One", "gap 2", "Three"]);
    const gap = group.slots[1];
    expect(gap.kind === "gap" && gap.wantedBook?.title).toBe("Two");
    expect(group.ownedCount).toBe(2);
    expect(group.total).toBe(3);
    expect(group.gaps).toEqual([2]);
  });

  it("shows only wanted books on the wishlist, including series you own nothing of", () => {
    const started = series({ title: "Started" });
    const unstarted = series({ title: "Unstarted" });
    const books = [
      book({ title: "Own", seriesId: started.id, seriesNumber: 1 }),
      book({ title: "Want 2", seriesId: started.id, seriesNumber: 2, ownership: "wanted" }),
      book({ title: "Want U1", seriesId: unstarted.id, seriesNumber: 1, ownership: "wanted" }),
      book({ title: "Want alone", ownership: "wanted" }),
    ];

    const view = buildLibraryView(books, [started, unstarted], "wishlist");

    expect(view.groups.map((group) => group.series.title)).toEqual(["Started", "Unstarted"]);
    expect(view.groups[0].slots).toHaveLength(1);
    expect(view.standalone.map((item) => item.title)).toEqual(["Want alone"]);
  });

  it("searches title and author, and stops drawing gaps while searching", () => {
    const saga = series({ title: "Saga" });
    const books = [
      book({ title: "Dracula", author: "Stoker", seriesId: saga.id, seriesNumber: 1 }),
      book({ title: "Other", author: "Someone", seriesId: saga.id, seriesNumber: 3 }),
      book({ title: "Hobbit", author: "Tolkien" }),
    ];

    const byAuthor = buildLibraryView(books, [saga], "library", "stoker");
    const none = buildLibraryView(books, [saga], "library", "zzz");

    expect(byAuthor.groups).toHaveLength(1);
    expect(byAuthor.groups[0].slots.every((slot) => slot.kind === "book")).toBe(true);
    expect(byAuthor.standalone).toEqual([]);
    expect(none.groups).toEqual([]);
    expect(none.standalone).toEqual([]);
  });

  it("treats a book whose series is unknown as standalone", () => {
    const books = [book({ title: "Orphan", seriesId: "gone", seriesNumber: 2 })];

    const view = buildLibraryView(books, [], "library");

    expect(view.standalone.map((item) => item.title)).toEqual(["Orphan"]);
  });
});

describe("series size", () => {
  it("counts a series by its stated size when that is larger than the books on record", () => {
    const saga = series({ title: "Saga", totalBooks: 5 });
    const books = [book({ seriesId: saga.id, seriesNumber: 2 })];

    const [group] = buildLibraryView(books, [saga], "library").groups;

    expect(group.total).toBe(5);
    expect(group.ownedCount).toBe(1);
  });

  it("grows past a stated size when a higher number is recorded", () => {
    const saga = series({ title: "Saga", totalBooks: 3 });
    const books = [book({ seriesId: saga.id, seriesNumber: 6 })];

    const [group] = buildLibraryView(books, [saga], "library").groups;

    expect(group.total).toBe(6);
  });
});

describe("shelf stats", () => {
  it("counts owned, wishlist and read books", () => {
    const books = [
      book({ status: "read" }),
      book({ status: "reading" }),
      book({ ownership: "wanted" }),
      book({ ownership: "wanted", status: "read" }),
    ];

    expect(shelfStats(books)).toEqual({ owned: 2, wishlist: 2, read: 1 });
  });
});
