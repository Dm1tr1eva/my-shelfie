import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { Rating } from "@/components/rating";
import { StatusChip } from "@/components/status-chip";
import type { Book } from "@/lib/books";

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
          <p className="text-sm text-muted">{book.author}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <Rating value={book.rating} />
        <StatusChip status={book.status} />
      </div>
    </li>
  );
}
