import { describe, it, expect } from "vitest";
import { book, series } from "@/test/helpers";
import { NO_FILTERS } from "./filters";
import { libraryShelves, rowsOf, seriesSlots, shelfRow, type SeriesSlot } from "./shelves";

const saga = series({ id: "saga", title: "Roots of Chaos", totalBooks: 6 });

function describeSlots(slots: SeriesSlot[]) {
  return slots.map((slot) =>
    slot.kind === "book" ? slot.book.title : `gap ${slot.from}-${slot.to}`,
  );
}

describe("seriesSlots", () => {
  it("puts owned and wanted books in number order and folds the missing numbers up to the series size into one gap", () => {
    const { slots, segments } = seriesSlots(saga, [
      book({ title: "Three", seriesId: "saga", seriesNumber: 3, ownership: "wanted" }),
      book({ title: "One", seriesId: "saga", seriesNumber: 1 }),
      book({ title: "Two", seriesId: "saga", seriesNumber: 2 }),
    ]);

    expect(describeSlots(slots)).toEqual(["One", "Two", "Three", "gap 4-6"]);
    expect(segments).toEqual(["owned", "owned", "wanted", "missing", "missing", "missing"]);
  });

  it("splits missing numbers that are not next to each other into separate gaps", () => {
    const { slots } = seriesSlots(series({ totalBooks: 7 }), [
      book({ title: "Two", seriesNumber: 2 }),
      book({ title: "Five", seriesNumber: 5 }),
    ]);

    expect(describeSlots(slots)).toEqual(["gap 1-1", "Two", "gap 3-4", "Five", "gap 6-7"]);
  });

  it("without a series size, counts only up to the highest known number", () => {
    const { slots } = seriesSlots(series(), [
      book({ title: "One", seriesNumber: 1 }),
      book({ title: "Four", seriesNumber: 4 }),
    ]);

    expect(describeSlots(slots)).toEqual(["One", "gap 2-3", "Four"]);
  });

  it("reaches an announced number of the series even past the known books", () => {
    const { slots } = seriesSlots(series({ expected: [{ number: 3, source: "manual" }] }), [
      book({ title: "One", seriesNumber: 1 }),
    ]);

    expect(describeSlots(slots)).toEqual(["One", "gap 2-3"]);
  });

  it("keeps a half number and an unnumbered book as books without letting them fill a gap", () => {
    const { slots, segments } = seriesSlots(series({ totalBooks: 3 }), [
      book({ title: "Side story", seriesNumber: 1.5 }),
      book({ title: "No number" }),
      book({ title: "One", seriesNumber: 1 }),
    ]);

    expect(describeSlots(slots)).toEqual(["One", "Side story", "gap 2-3", "No number"]);
    expect(segments).toHaveLength(5);
  });
});

describe("shelfRow", () => {
  const slots: SeriesSlot[] = [
    ...[1, 2, 3, 4, 5].map((number) => ({
      kind: "book" as const,
      book: book({ seriesNumber: number }),
    })),
    { kind: "gap", from: 6, to: 9 },
    { kind: "book", book: book({ seriesNumber: 10 }) },
  ];

  it("shows everything when the series fits in one row", () => {
    expect(shelfRow(slots, 7)).toEqual({ shown: slots, more: 0 });
  });

  it("keeps the last place of a full row for the more tile and counts every hidden book and missing number", () => {
    const { shown, more } = shelfRow(slots, 4);

    expect(shown).toEqual(slots.slice(0, 3));
    expect(more).toBe(2 + 4 + 1);
  });
});

describe("rowsOf", () => {
  it("cuts standalone books into rows of the column count, the last one shorter", () => {
    expect(rowsOf([1, 2, 3, 4, 5, 6, 7, 8, 9], 4)).toEqual([[1, 2, 3, 4], [5, 6, 7, 8], [9]]);
  });
});

describe("libraryShelves", () => {
  const one = book({ title: "Ash One", seriesId: "saga", seriesNumber: 1, genres: ["Fantasy"] });
  const two = book({
    title: "Ash Two",
    seriesId: "saga",
    seriesNumber: 2,
    ownership: "wanted",
  });
  const alone = book({ title: "Stand Alone", author: "Solo Person" });
  const wished = book({ title: "Wished Alone", ownership: "wanted" });

  it("shows owned and wanted books together, series first and standalone books apart", () => {
    const shelves = libraryShelves([one, two, alone, wished], [saga]);

    expect(shelves.series.map((shelf) => shelf.series.title)).toEqual(["Roots of Chaos"]);
    expect(describeSlots(shelves.series[0].slots)).toEqual(["Ash One", "Ash Two", "gap 3-6"]);
    expect(shelves.standalone.map((item) => item.title)).toEqual(["Stand Alone", "Wished Alone"]);
    expect(shelves.count).toBe(4);
  });

  it("treats a book whose series is gone as standalone", () => {
    const orphan = book({ title: "Orphan", seriesId: "missing", seriesNumber: 2 });

    expect(libraryShelves([orphan], [saga]).standalone).toEqual([orphan]);
  });

  it("finds books by the title of their series and keeps the gaps of a shown series", () => {
    const shelves = libraryShelves([one, two, alone], [saga], "chaos");

    expect(describeSlots(shelves.series[0].slots)).toEqual(["Ash One", "Ash Two", "gap 3-6"]);
    expect(shelves.standalone).toEqual([]);
    expect(shelves.count).toBe(2);
  });

  it("hides the books a filter leaves out but keeps the segments of the whole series", () => {
    const shelves = libraryShelves([one, two, alone], [saga], "", {
      ...NO_FILTERS,
      have: ["owned"],
    });

    expect(describeSlots(shelves.series[0].slots)).toEqual(["Ash One", "gap 3-6"]);
    expect(shelves.series[0].segments).toHaveLength(6);
    expect(shelves.count).toBe(2);
  });

  it("drops a series none of whose books match", () => {
    const shelves = libraryShelves([one, two, alone], [saga], "solo");

    expect(shelves.series).toEqual([]);
    expect(shelves.count).toBe(1);
  });
});
