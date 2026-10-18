import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { GenreChip, OwnershipChip, TropeChip } from "@/components/chips";
import { ChevronRightIcon } from "@/components/icons";
import { StatusChip } from "@/components/status-chip";
import type { Book } from "@/lib/books";
import type { Series } from "@/lib/series";

export function BookRow({ book, series }: { book: Book; series?: Series }) {
  const tropes = book.tropes.slice(0, 2);
  const hidden = book.tropes.length - tropes.length;

  return (
    <li>
      <Link
        href={`/books/${book.id}`}
        className="flex items-center gap-4 border-b border-mist py-3 hover:bg-card/60"
      >
        <BookCover url={book.coverUrl} title={book.title} size="sm" format={book.format} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-semibold">{book.title}</span>
          <span className="text-sm text-muted">
            {series && book.seriesNumber !== undefined
              ? `${series.title} · #${book.seriesNumber}`
              : book.author}
          </span>
          <span className="flex flex-wrap items-center gap-2">
            {book.genres[0] && <GenreChip genre={book.genres[0]} />}
            {tropes.map((trope) => (
              <TropeChip key={trope} trope={trope} />
            ))}
            {hidden > 0 && <span className="text-xs text-muted">+{hidden}</span>}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-2">
          {book.ownership === "wanted" ? (
            <OwnershipChip ownership="wanted" />
          ) : (
            <StatusChip status={book.status} />
          )}
          {book.rating ? (
            <span
              role="img"
              aria-label={`Rated ${book.rating} out of 5`}
              className="font-semibold text-burgundy"
            >
              ★ {book.rating}
            </span>
          ) : null}
        </span>
        <ChevronRightIcon size={18} />
      </Link>
    </li>
  );
}
