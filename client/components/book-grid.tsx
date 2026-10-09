import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { Rating } from "@/components/rating";
import { StatusChip } from "@/components/status-chip";
import type { Book } from "@/lib/books";

function BookCard({ book }: { book: Book }) {
  return (
    <li>
      <Link
        href={`/dashboard/books/${book.id}`}
        className="card flex h-full flex-col gap-3 p-3 transition-colors hover:bg-surface-alt"
      >
        <BookCover url={book.coverUrl} size="fill" />
        <div className="flex flex-col gap-1">
          <span className="line-clamp-2 font-medium">{book.title}</span>
          <span className="line-clamp-1 text-sm text-muted">{book.author}</span>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-sm">
          <StatusChip status={book.status} />
          <Rating value={book.rating} />
        </div>
      </Link>
    </li>
  );
}

export function BookGrid({ books }: { books: Book[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {books.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </ul>
  );
}
