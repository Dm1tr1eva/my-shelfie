import { describe, it, expect } from "vitest";
import {
  NO_FILTERS,
  activeFilterCount,
  libraryFilterGroups,
  matchesFilters,
  panelChipLabel,
  type Filters,
  type Subject,
} from "./filters";
import type { Book, Genre } from "./books";
import type { Series } from "./series";
import { translator } from "./i18n";
import { englishDomain } from "./i18n/domain";

let counter = 0;

function book(overrides: Partial<Book> = {}): Book {
  counter += 1;
  return {
    id: `book-${counter}`,
    userId: "u1",
    title: `Book ${counter}`,
    author: "An author",
    status: "want",
    ownership: "owned",
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

function series(overrides: Partial<Series> = {}): Series {
  counter += 1;
  return {
    id: `series-${counter}`,
    title: `Series ${counter}`,
    status: "ongoing",
    ownedCount: 0,
    wantedCount: 0,
    ageRating: "none",
    desire: "normal",
    expected: [],
    genres: [],
    tropes: [],
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

const keep = (items: Subject[], filters: Filters) =>
  items.filter((item) => matchesFilters(item, filters));
const only = (patch: Partial<Filters>): Filters => ({ ...NO_FILTERS, ...patch });

describe("filters by what a link leads to", () => {
  const paper = book({
    title: "P",
    links: [
      { kind: "ebook", languages: ["uk"], url: "https://e.example" },
      { kind: "paper", languages: ["uk"], url: "https://p.example" },
    ],
  });
  const mixed = book({
    title: "M",
    links: [
      { kind: "online", languages: ["en"], url: "https://o.example" },
      { kind: "free", languages: ["en"], url: "https://f.example" },
    ],
  });
  const none = book({ title: "N" });
  const items: Subject[] = [paper, mixed, none].map((item) => ({ book: item }));

  it("keeps the books that have a link of a chosen kind", () => {
    const kept = keep(items, only({ kind: ["free"] }));

    expect(kept.map((item) => item.book?.title)).toEqual(["M"]);
  });
});

describe("filters", () => {
  const fantasyUk = book({
    title: "A",
    genres: ["Fantasy" as Genre],
    links: [{ kind: "paper", languages: ["uk"], url: "https://a.example" }],
    author: "Maas",
  });
  const romanceRu = book({
    title: "B",
    genres: ["Romance" as Genre],
    links: [{ kind: "paper", languages: ["ru"], url: "https://b.example" }],
    author: "Collins",
  });
  const both = book({
    title: "C",
    genres: ["Fantasy" as Genre, "Romance" as Genre],
    tropes: ["slow burn"],
    links: [
      { kind: "paper", languages: ["uk"], url: "https://c.example" },
      { kind: "paper", languages: ["ru"], url: "https://c2.example" },
    ],
    author: "Maas",
  });
  const items: Subject[] = [{ book: fantasyUk }, { book: romanceRu }, { book: both }];
  const titles = (list: Subject[]) => list.map((item) => item.book?.title);

  it("finds a book by any language of a link that has several", () => {
    const bilingual = book({
      title: "D",
      links: [{ kind: "ebook", languages: ["ru", "en"], url: "https://d.example" }],
    });

    const result = keep([{ book: bilingual }], only({ language: ["en"] }));

    expect(titles(result)).toEqual(["D"]);
  });

  it("keeps everything when no filter is chosen", () => {
    expect(keep(items, NO_FILTERS)).toHaveLength(3);
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
  });

  it("takes any of the values chosen inside one group", () => {
    const result = keep(items, only({ genre: ["Fantasy", "Romance"] }));

    expect(titles(result)).toEqual(["A", "B", "C"]);
  });

  it("requires every group that has a choice", () => {
    const result = keep(items, only({ genre: ["Fantasy"], language: ["ru"], author: ["Maas"] }));

    expect(titles(result)).toEqual(["C"]);
  });

  it("filters by the series status and leaves out books with no series", () => {
    const saga = series({ status: "complete" });
    const list: Subject[] = [{ book: fantasyUk, series: saga }, { book: romanceRu }];

    const result = keep(list, only({ status: ["complete"] }));

    expect(titles(result)).toEqual(["A"]);
  });

  it("lets a missing number match only the status and author filters", () => {
    const saga = series({ status: "ongoing", author: "Maas" });
    const missing: Subject = { series: saga };

    expect(keep([missing], only({ status: ["ongoing"] }))).toHaveLength(1);
    expect(keep([missing], only({ author: ["Maas"] }))).toHaveLength(1);
    expect(keep([missing], only({ genre: ["Fantasy"] }))).toHaveLength(0);
    expect(keep([missing], only({ language: ["uk"] }))).toHaveLength(0);
    expect(keep([missing], only({ trope: ["slow burn"] }))).toHaveLength(0);
  });
});

describe("library filter groups", () => {
  const labels = { t: translator("en"), domain: englishDomain };
  const keysOf = (subjects: Subject[]) =>
    libraryFilterGroups(subjects, labels).map((group) => group.key);

  it("offers only the groups the library has data for, in the order of the design", () => {
    expect(keysOf([{ book: book() }])).toEqual([
      "have",
      "reading",
      "format",
      "author",
      "status",
      "rating",
    ]);

    expect(
      keysOf([
        {
          book: book({
            genres: ["Fantasy"],
            tropes: ["Dragons"],
            ageRating: "16",
            links: [{ kind: "free", languages: ["en"], url: "https://a.example" }],
          }),
        },
      ]),
    ).toEqual([
      "have",
      "reading",
      "format",
      "genre",
      "age",
      "trope",
      "author",
      "status",
      "language",
      "kind",
      "rating",
    ]);
  });

  it("lists every rating bucket and a standalone choice next to the series statuses", () => {
    const groups = libraryFilterGroups([{ book: book() }], labels);
    const optionsOf = (key: string) =>
      groups.find((group) => group.key === key)?.options.map((option) => option.label);

    expect(optionsOf("rating")).toEqual(["★ 5", "★ 4", "★ 3 and lower", "No rating"]);
    expect(optionsOf("status")).toEqual([
      "Ongoing",
      "Readable now",
      "Complete",
      "Unknown",
      "Standalone books",
    ]);
  });

  it("matches ratings by bucket, three and lower together", () => {
    const low = only({ rating: ["low"] });

    expect(matchesFilters({ book: book({ rating: 2 }) }, low)).toBe(true);
    expect(matchesFilters({ book: book({ rating: 3 }) }, low)).toBe(true);
    expect(matchesFilters({ book: book({ rating: 4 }) }, low)).toBe(false);
    expect(matchesFilters({ book: book() }, only({ rating: ["none"] }))).toBe(true);
  });

  it("matches a rating only for books you have, since a wanted book shows none", () => {
    expect(
      matchesFilters({ book: book({ ownership: "wanted" }) }, only({ rating: ["none"] })),
    ).toBe(false);
    expect(
      matchesFilters({ book: book({ ownership: "wanted", rating: 5 }) }, only({ rating: ["5"] })),
    ).toBe(false);
  });

  it("matches the standalone choice only for a book outside any series", () => {
    const standalone = only({ status: ["standalone"] });

    expect(matchesFilters({ book: book() }, standalone)).toBe(true);
    expect(matchesFilters({ book: book(), series: series() }, standalone)).toBe(false);
  });

  it("matches a reading status only for books you have, since a wanted book shows none", () => {
    const toRead = only({ reading: ["want"] });

    expect(matchesFilters({ book: book({ status: "want" }) }, toRead)).toBe(true);
    expect(matchesFilters({ book: book({ status: "want", ownership: "wanted" }) }, toRead)).toBe(
      false,
    );
  });

  it("matches what you have against what you want", () => {
    const wanted = only({ have: ["wanted"] });

    expect(matchesFilters({ book: book({ ownership: "wanted" }) }, wanted)).toBe(true);
    expect(matchesFilters({ book: book() }, wanted)).toBe(false);
  });

  it("names an active filter pill with its group where the value alone is unclear", () => {
    expect(panelChipLabel("age", "18", labels)).toBe("Age: 18+");
    expect(panelChipLabel("language", "uk", labels)).toBe("Link language: UK");
    expect(panelChipLabel("status", "standalone", labels)).toBe("Standalone books");
    expect(panelChipLabel("genre", "Fantasy", labels)).toBe("Fantasy");
  });
});
