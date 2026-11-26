import type { Book } from "./books";
import { isOwned } from "./catalogue";
import { NO_FILTERS, matchesFilters, type Filters } from "./filters";
import type { Series } from "./series";

export type SegmentState = "owned" | "wanted" | "missing";

export type GapSlot = { kind: "gap"; from: number; to: number; expectedYear?: number };

export type SeriesSlot = { kind: "book"; book: Book } | GapSlot;

export type SeriesShelf = {
  series: Series;
  slots: SeriesSlot[];
  segments: SegmentState[];
};

export type LibraryShelves = {
  series: SeriesShelf[];
  standalone: Book[];
  count: number;
};

function isWholeNumber(value: number | undefined): value is number {
  return value !== undefined && Number.isInteger(value) && value > 0;
}

function sortKey(slot: SeriesSlot) {
  if (slot.kind === "gap") return slot.from;
  return slot.book.seriesNumber ?? Infinity;
}

function bySlotOrder(a: SeriesSlot, b: SeriesSlot) {
  const difference = sortKey(a) - sortKey(b);
  if (difference !== 0 && !Number.isNaN(difference)) return difference;
  if (a.kind === "book" && b.kind === "book") return a.book.title.localeCompare(b.book.title);
  return 0;
}

function slotSize(slot: SeriesSlot) {
  return slot.kind === "gap" ? slot.to - slot.from + 1 : 1;
}

function gapOf(series: Series, from: number, to: number): GapSlot {
  const years = series.expected
    .filter((entry) => entry.number >= from && entry.number <= to)
    .flatMap((entry) => (entry.expectedYear === undefined ? [] : [entry.expectedYear]));

  return years.length > 0
    ? { kind: "gap", from, to, expectedYear: Math.min(...years) }
    : { kind: "gap", from, to };
}

export function seriesSlots(series: Series, books: Book[]) {
  const taken = new Set(books.map((book) => book.seriesNumber).filter(isWholeNumber));
  const highest = Math.max(
    series.totalBooks ?? 0,
    ...taken,
    ...series.expected.map((entry) => entry.number).filter(isWholeNumber),
  );

  const slots: SeriesSlot[] = books.map((book) => ({ kind: "book", book }));
  let start: number | undefined;

  for (let number = 1; number <= highest + 1; number += 1) {
    const missing = number <= highest && !taken.has(number);
    if (missing && start === undefined) start = number;
    if (!missing && start !== undefined) {
      slots.push(gapOf(series, start, number - 1));
      start = undefined;
    }
  }

  slots.sort(bySlotOrder);

  const segments = slots.flatMap((slot): SegmentState[] => {
    if (slot.kind === "gap") return Array(slotSize(slot)).fill("missing");
    return [isOwned(slot.book) ? "owned" : "wanted"];
  });

  return { slots, segments };
}

export function shelfRow(slots: SeriesSlot[], columns: number) {
  if (slots.length <= columns) return { shown: slots, more: 0 };

  const shown = slots.slice(0, columns - 1);
  const more = slots.slice(columns - 1).reduce((sum, slot) => sum + slotSize(slot), 0);
  return { shown, more };
}

export function rowsOf<T>(items: T[], columns: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += columns) {
    rows.push(items.slice(index, index + columns));
  }
  return rows;
}

export function matchesLibraryQuery(book: Book, series: Series | undefined, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [book.title, book.author, series?.title ?? ""].some((text) =>
    text.toLowerCase().includes(needle),
  );
}

export function libraryShelves(
  books: Book[],
  series: Series[],
  query = "",
  filters: Filters = NO_FILTERS,
): LibraryShelves {
  const seriesById = new Map(series.map((item) => [item.id, item]));
  const booksBySeries = new Map<string, Book[]>();
  const standalone: Book[] = [];
  let count = 0;

  const matches = (book: Book, owner?: Series) =>
    matchesLibraryQuery(book, owner, query) && matchesFilters({ book, series: owner }, filters);

  for (const book of books) {
    const owner = book.seriesId ? seriesById.get(book.seriesId) : undefined;
    if (owner) {
      booksBySeries.set(owner.id, [...(booksBySeries.get(owner.id) ?? []), book]);
    } else if (matches(book)) {
      standalone.push(book);
    }
  }

  const shelves: SeriesShelf[] = [];

  for (const [seriesId, members] of booksBySeries) {
    const owner = seriesById.get(seriesId) as Series;
    const { slots, segments } = seriesSlots(owner, members);
    const visible = slots.filter((slot) => slot.kind === "gap" || matches(slot.book, owner));
    const shownBooks = visible.filter((slot) => slot.kind === "book").length;
    if (shownBooks === 0) continue;

    count += shownBooks;
    shelves.push({ series: owner, slots: visible, segments });
  }

  const latest = (shelf: SeriesShelf) =>
    Math.max(
      ...(booksBySeries.get(shelf.series.id) ?? []).map((book) => Date.parse(book.createdAt) || 0),
      Date.parse(shelf.series.createdAt) || 0,
    );
  shelves.sort((a, b) => latest(b) - latest(a) || a.series.title.localeCompare(b.series.title));
  standalone.sort((a, b) => a.title.localeCompare(b.title));

  return { series: shelves, standalone, count: count + standalone.length };
}
