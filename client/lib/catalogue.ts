import type { Book } from "./books";

export function isOwned(book: Book) {
  return book.ownership !== "wanted";
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
