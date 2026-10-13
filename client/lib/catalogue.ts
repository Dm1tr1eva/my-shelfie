import type { Book } from "./books";
import type { Series } from "./series";

export type LibraryTab = "library" | "wishlist";

export type ShelfSlot =
  { kind: "book"; book: Book } | { kind: "gap"; number: number; wantedBook?: Book };

export type SeriesGroup = {
  series: Series;
  slots: ShelfSlot[];
  ownedCount: number;
  total: number;
  ownedNumbers: number[];
  gaps: number[];
};

export type LibraryView = {
  groups: SeriesGroup[];
  standalone: Book[];
};

export function isOwned(book: Book) {
  return book.ownership !== "wanted";
}

function byNumberThenTitle(a: Book, b: Book) {
  const aNumber = a.seriesNumber ?? Infinity;
  const bNumber = b.seriesNumber ?? Infinity;
  if (aNumber !== bNumber) return aNumber - bNumber;
  return a.title.localeCompare(b.title);
}

export function ownedNumbersOf(books: Book[]): number[] {
  const numbers = books
    .filter((book) => isOwned(book) && book.seriesNumber !== undefined)
    .map((book) => book.seriesNumber as number);

  return [...new Set(numbers)].sort((a, b) => a - b);
}

export function highestNumberOf(books: Book[]): number {
  return books.reduce((highest, book) => Math.max(highest, book.seriesNumber ?? 0), 0);
}

export function gapNumbersOf(books: Book[]): number[] {
  const owned = new Set(ownedNumbersOf(books));
  const highestOwned = Math.max(0, ...owned);
  const gaps = new Set<number>();

  for (let number = 1; number < highestOwned; number += 1) {
    if (!owned.has(number)) gaps.add(number);
  }

  for (const book of books) {
    const number = book.seriesNumber;
    if (number !== undefined && !isOwned(book) && number < highestOwned && !owned.has(number)) {
      gaps.add(number);
    }
  }

  return [...gaps].sort((a, b) => a - b);
}

function matchesQuery(book: Book, query: string) {
  if (!query) return true;
  const needle = query.toLowerCase();
  return book.title.toLowerCase().includes(needle) || book.author.toLowerCase().includes(needle);
}

export function buildLibraryView(
  books: Book[],
  series: Series[],
  tab: LibraryTab,
  query = "",
): LibraryView {
  const wantedTab = tab === "wishlist";
  const seriesById = new Map(series.map((item) => [item.id, item]));
  const booksBySeries = new Map<string, Book[]>();
  const standalone: Book[] = [];

  for (const book of books) {
    const owner = book.seriesId ? seriesById.get(book.seriesId) : undefined;

    if (!owner) {
      if (isOwned(book) !== wantedTab && matchesQuery(book, query)) standalone.push(book);
      continue;
    }

    const group = booksBySeries.get(owner.id) ?? [];
    group.push(book);
    booksBySeries.set(owner.id, group);
  }

  const groups: SeriesGroup[] = [];
  const searching = query.trim() !== "";

  for (const [seriesId, allBooks] of booksBySeries) {
    const visible = allBooks
      .filter((book) => isOwned(book) !== wantedTab && matchesQuery(book, query))
      .sort(byNumberThenTitle);
    if (visible.length === 0) continue;

    const gaps = gapNumbersOf(allBooks);
    const slots: ShelfSlot[] = visible.map((book) => ({ kind: "book", book }));

    if (!wantedTab && !searching) {
      for (const number of gaps) {
        const wantedBook = allBooks.find((book) => !isOwned(book) && book.seriesNumber === number);
        slots.push({ kind: "gap", number, wantedBook });
      }
      slots.sort((a, b) => slotNumber(a) - slotNumber(b));
    }

    groups.push({
      series: seriesById.get(seriesId) as Series,
      slots,
      ownedCount: allBooks.filter(isOwned).length,
      total: Math.max(highestNumberOf(allBooks), allBooks.length),
      ownedNumbers: ownedNumbersOf(allBooks),
      gaps,
    });
  }

  groups.sort((a, b) => a.series.title.localeCompare(b.series.title));
  standalone.sort((a, b) => a.title.localeCompare(b.title));

  return { groups, standalone };
}

function slotNumber(slot: ShelfSlot) {
  if (slot.kind === "gap") return slot.number;
  return slot.book.seriesNumber ?? Infinity;
}

export function shelfStats(books: Book[]) {
  return {
    owned: books.filter(isOwned).length,
    wishlist: books.filter((book) => !isOwned(book)).length,
    read: books.filter((book) => isOwned(book) && book.status === "read").length,
  };
}
