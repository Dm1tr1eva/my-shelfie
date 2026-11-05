import { DEFAULT_GENRES, type Book, type Genre } from "./books";
import type { Series } from "./series";

export function knownGenres(books: Book[], series: Series[], chosen: Genre[]): Genre[] {
  const seen = new Set(DEFAULT_GENRES.map((name) => name.toLowerCase()));
  const own: Genre[] = [];

  for (const name of [
    ...books.flatMap((book) => book.genres),
    ...series.flatMap((item) => item.genres),
    ...chosen,
  ]) {
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      own.push(name);
    }
  }

  return [...DEFAULT_GENRES, ...own.sort((a, b) => a.localeCompare(b))];
}
