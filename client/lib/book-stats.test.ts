import { describe, it, expect } from "vitest";
import { computeStats } from "./book-stats";
import type { Book, BookStatus } from "./books";

function book(status: BookStatus, rating?: number): Book {
  return {
    id: `${status}-${rating ?? "none"}-${Math.random()}`,
    userId: "u1",
    title: "A book",
    author: "An author",
    status,
    rating,
    createdAt: "",
    updatedAt: "",
  };
}

describe("computeStats", () => {
  it("counts the shelf, the books read and the books being read", () => {
    const stats = computeStats([
      book("read"),
      book("read"),
      book("reading"),
      book("want"),
      book("dropped"),
    ]);

    expect(stats).toMatchObject({ total: 5, read: 2, reading: 1 });
  });

  it("averages only the books that have a rating, to one decimal place", () => {
    const stats = computeStats([book("read", 5), book("read", 4), book("read", 4), book("want")]);

    expect(stats.averageRating).toBe(4.3);
  });

  it("has no average when nothing is rated", () => {
    expect(computeStats([book("want"), book("reading")]).averageRating).toBeNull();
  });

  it("is all zeros for an empty shelf", () => {
    expect(computeStats([])).toEqual({ total: 0, read: 0, reading: 0, averageRating: null });
  });
});
