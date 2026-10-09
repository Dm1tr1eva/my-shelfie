import type { Book } from "./books";

export type ShelfStats = {
  total: number;
  read: number;
  reading: number;
  averageRating: number | null;
};

export function computeStats(books: Book[]): ShelfStats {
  const ratings = books.flatMap((book) => (book.rating ? [book.rating] : []));
  const sum = ratings.reduce((total, rating) => total + rating, 0);

  return {
    total: books.length,
    read: books.filter((book) => book.status === "read").length,
    reading: books.filter((book) => book.status === "reading").length,
    averageRating: ratings.length ? Math.round((sum / ratings.length) * 10) / 10 : null,
  };
}
