import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import type { Book } from "@/lib/books";

export function CurrentlyReading({ books }: { books: Book[] }) {
  if (books.length === 0) return null;

  return (
    <section aria-labelledby="currently-reading-heading" className="flex flex-col gap-3">
      <h2 id="currently-reading-heading" className="text-xl">
        Currently reading
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {books.map((book) => (
          <li key={book.id}>
            <Link
              href={`/dashboard/books/${book.id}`}
              className="card flex items-center gap-4 p-3 transition-colors hover:bg-surface-alt"
            >
              <BookCover url={book.coverUrl} size="lg" />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="line-clamp-2 font-display text-lg">{book.title}</span>
                <span className="line-clamp-1 text-sm text-muted">{book.author}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
