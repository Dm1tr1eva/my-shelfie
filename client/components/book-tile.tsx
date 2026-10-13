import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { LangBadge } from "@/components/chips";
import { StatusChip } from "@/components/status-chip";
import { LINK_LANGUAGES, type Book } from "@/lib/books";

export function BookTile({
  book,
  showNumber = true,
  showLinks = false,
}: {
  book: Book;
  showNumber?: boolean;
  showLinks?: boolean;
}) {
  const languages = LINK_LANGUAGES.map((item) => item.value).filter((language) =>
    book.links.some((link) => link.language === language),
  );

  return (
    <li>
      <Link href={`/books/${book.id}`} className="flex flex-col gap-2">
        <BookCover
          url={book.coverUrl}
          title={book.title}
          number={showNumber ? book.seriesNumber : undefined}
        />
        <span className="line-clamp-2 text-[15px] font-semibold leading-snug">{book.title}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          {book.ownership === "owned" && <StatusChip status={book.status} />}
          {book.rating ? (
            <span
              aria-label={`Rated ${book.rating} out of 5`}
              className="font-semibold text-burgundy"
            >
              ★ {book.rating}
            </span>
          ) : null}
          {showLinks &&
            (languages.length > 0 ? (
              languages.map((language) => <LangBadge key={language} language={language} />)
            ) : (
              <span>No links yet</span>
            ))}
        </span>
      </Link>
    </li>
  );
}
