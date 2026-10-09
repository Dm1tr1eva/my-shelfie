import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { STATUS_LABELS, type Book } from "@/lib/books";

export function BookRow({ book }: { book: Book }) {
  return (
    <li className="flex flex-col gap-2 border-b py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <BookCover url={book.coverUrl} />
        <div>
          <Link
            href={`/dashboard/books/${book.id}`}
            className="font-medium underline-offset-2 hover:underline"
          >
            {book.title}
          </Link>
          <p className="text-sm text-neutral-500">{book.author}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm">
        {book.rating && (
          <span aria-label={`Rated ${book.rating} out of 5`}>{"★".repeat(book.rating)}</span>
        )}
        <span className="rounded-full border px-2 py-0.5">{STATUS_LABELS[book.status]}</span>
      </div>
    </li>
  );
}
