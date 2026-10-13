import { describe, it, expect } from "vitest";
import {
  NO_FILTERS,
  activeFilterCount,
  applyFilters,
  buildFilterGroups,
  chipLabel,
  type Filters,
  type Subject,
} from "./filters";
import type { Book, Genre } from "./books";
import type { Series } from "./series";

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
    genres: [],
    tropes: [],
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

const subjectOf = (item: Subject) => item;
const only = (patch: Partial<Filters>): Filters => ({ ...NO_FILTERS, ...patch });

describe("filters", () => {
  const fantasyUk = book({
    title: "A",
    genres: ["Fantasy" as Genre],
    links: [{ language: "uk", url: "https://a.example" }],
    author: "Maas",
  });
  const romanceRu = book({
    title: "B",
    genres: ["Romance" as Genre],
    links: [{ language: "ru", url: "https://b.example" }],
    author: "Collins",
  });
  const both = book({
    title: "C",
    genres: ["Fantasy" as Genre, "Romance" as Genre],
    tropes: ["slow burn"],
    links: [
      { language: "uk", url: "https://c.example" },
      { language: "ru", url: "https://c2.example" },
    ],
    author: "Maas",
  });
  const items: Subject[] = [{ book: fantasyUk }, { book: romanceRu }, { book: both }];
  const titles = (list: Subject[]) => list.map((item) => item.book?.title);

  it("keeps everything when no filter is chosen", () => {
    expect(applyFilters(items, subjectOf, NO_FILTERS)).toHaveLength(3);
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
  });

  it("takes any of the values chosen inside one group", () => {
    const result = applyFilters(items, subjectOf, only({ genre: ["Fantasy", "Romance"] }));

    expect(titles(result)).toEqual(["A", "B", "C"]);
  });

  it("requires every group that has a choice", () => {
    const result = applyFilters(
      items,
      subjectOf,
      only({ genre: ["Fantasy"], language: ["ru"], author: ["Maas"] }),
    );

    expect(titles(result)).toEqual(["C"]);
  });

  it("filters by the series status and leaves out books with no series", () => {
    const saga = series({ status: "complete" });
    const list: Subject[] = [{ book: fantasyUk, series: saga }, { book: romanceRu }];

    const result = applyFilters(list, subjectOf, only({ status: ["complete"] }));

    expect(titles(result)).toEqual(["A"]);
  });

  it("lets a missing number match only the status and author filters", () => {
    const saga = series({ status: "ongoing", author: "Maas" });
    const missing: Subject = { series: saga };

    expect(applyFilters([missing], subjectOf, only({ status: ["ongoing"] }))).toHaveLength(1);
    expect(applyFilters([missing], subjectOf, only({ author: ["Maas"] }))).toHaveLength(1);
    expect(applyFilters([missing], subjectOf, only({ genre: ["Fantasy"] }))).toHaveLength(0);
    expect(applyFilters([missing], subjectOf, only({ language: ["uk"] }))).toHaveLength(0);
    expect(applyFilters([missing], subjectOf, only({ trope: ["slow burn"] }))).toHaveLength(0);
  });

  it("counts each option among the books that match the other groups", () => {
    const groups = buildFilterGroups(items, subjectOf, only({ language: ["ru"] }));
    const genre = groups.find((group) => group.key === "genre");
    const language = groups.find((group) => group.key === "language");

    expect(genre?.options.map((option) => [option.value, option.count])).toEqual([
      ["Romance", 2],
      ["Fantasy", 1],
    ]);
    expect(language?.options.map((option) => [option.value, option.count])).toEqual([
      ["ru", 2],
      ["uk", 2],
    ]);
  });

  it("keeps an option that is chosen or has no books under the other filters, with a count of 0", () => {
    const groups = buildFilterGroups(items, subjectOf, only({ author: ["Collins"] }));
    const genre = groups.find((group) => group.key === "genre");

    expect(genre?.options.find((option) => option.value === "Fantasy")?.count).toBe(0);
  });

  it("keeps a chosen value in its list even when no book carries it", () => {
    const groups = buildFilterGroups(items, subjectOf, only({ genre: ["Horror"] }));
    const genre = groups.find((group) => group.key === "genre");

    expect(genre?.options.find((option) => option.value === "Horror")).toMatchObject({
      value: "Horror",
      count: 0,
    });
  });

  it("orders statuses and languages as the app does and labels them", () => {
    const list: Subject[] = [
      { book: both, series: series({ status: "unknown" }) },
      { book: fantasyUk, series: series({ status: "ongoing" }) },
    ];

    const groups = buildFilterGroups(list, subjectOf, NO_FILTERS);
    const status = groups.find((group) => group.key === "status");
    const language = groups.find((group) => group.key === "language");

    expect(status?.options.map((option) => option.label)).toEqual(["Ongoing", "Unknown"]);
    expect(language?.options.map((option) => [option.badge, option.label])).toEqual([
      ["RU", "Russian"],
      ["UK", "Ukrainian"],
    ]);
  });

  it("offers search in the trope and author groups only", () => {
    const groups = buildFilterGroups(items, subjectOf, NO_FILTERS);

    expect(groups.filter((group) => group.searchable).map((group) => group.key)).toEqual([
      "trope",
      "author",
    ]);
  });

  it("writes a chip for each kind of filter", () => {
    expect(chipLabel("genre", "Romantasy")).toBe("Romantasy");
    expect(chipLabel("language", "uk")).toBe("Shop language: UK");
    expect(chipLabel("status", "ongoing")).toBe("Series: Ongoing");
  });
});
