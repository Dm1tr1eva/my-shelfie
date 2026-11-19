"use client";

import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { SeriesStatusChip, StatusDot, WishlistLabel } from "@/components/chips";
import { PlusIcon } from "@/components/icons";
import { SeriesSegments } from "@/components/series-segments";
import type { Book } from "@/lib/books";
import { isOwned } from "@/lib/catalogue";
import { useT } from "@/lib/i18n";
import type { Series } from "@/lib/series";
import type { SegmentState } from "@/lib/shelves";

export const SHELF_COLUMNS = "grid-cols-4 lg:grid-cols-7";

const TILE_TEXT = "sr-only md:not-sr-only";

function rangeText(from: number, to: number) {
  return from === to ? `#${from}` : `#${from}–${to}`;
}

export function LibraryBookTile({ book, showNumber = true }: { book: Book; showNumber?: boolean }) {
  const t = useT();
  const owned = isOwned(book);

  return (
    <li>
      <Link href={`/books/${book.id}`} className="flex flex-col gap-2">
        <div className={owned ? undefined : "opacity-50 saturate-[.6]"}>
          <BookCover
            url={book.coverUrl}
            title={book.title}
            number={showNumber ? book.seriesNumber : undefined}
            format={book.format}
          />
        </div>
        <span
          className={`${TILE_TEXT} md:line-clamp-2 md:h-[2.6em] md:text-sm md:font-semibold md:leading-[1.3]`}
        >
          {book.title}
        </span>{" "}
        <span
          className={`${TILE_TEXT} md:flex md:h-5 md:items-center md:gap-2 md:overflow-hidden md:text-xs`}
        >
          {owned ? <StatusDot status={book.status} /> : <WishlistLabel />}
          {owned && book.rating ? (
            <span
              role="img"
              aria-label={t("library.rating", { rating: book.rating })}
              className="whitespace-nowrap font-semibold text-burgundy"
            >
              ★ {book.rating}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}

export function LibraryGapTile({ series, from, to }: { series: Series; from: number; to: number }) {
  const t = useT();
  const range = rangeText(from, to);

  return (
    <li>
      <Link
        href={`/add?series=${series.id}&number=${from}`}
        aria-label={t("library.shelf.gapLabel", { range, series: series.title })}
        className="flex aspect-[2/3] w-full flex-col items-center justify-center gap-1.5 rounded-cover border-[1.5px] border-dashed border-burgundy bg-burgundy/5 px-1 text-center text-burgundy"
      >
        <span className="num text-base md:text-xl">{range}</span>
        <span className="hidden text-xs font-semibold md:block">
          {t("library.shelf.notInCatalogue")}
        </span>
        <span className="hidden h-7 items-center rounded-full bg-burgundy px-3 text-xs font-bold text-card md:inline-flex">
          {t("library.shelf.add")}
        </span>
        <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-burgundy text-card md:hidden">
          <PlusIcon size={14} />
        </span>
      </Link>
    </li>
  );
}

export function LibraryMoreTile({ series, count }: { series: Series; count: number }) {
  const t = useT();

  return (
    <li>
      <Link
        href={`/series/${series.id}`}
        aria-label={t("library.shelf.moreLabel", { count, series: series.title })}
        className="flex aspect-[2/3] w-full flex-col items-center justify-center gap-1 rounded-cover bg-beige text-navy"
      >
        <span className="num text-xl md:text-[26px]">+{count}</span>
        <span className="text-xs font-semibold">{t("library.shelf.more")}</span>
      </Link>
    </li>
  );
}

export function SeriesShelfHeader({
  series,
  segments,
  headingId,
}: {
  series: Series;
  segments: SegmentState[];
  headingId: string;
}) {
  return (
    <Link
      href={`/series/${series.id}`}
      className="flex items-start justify-between gap-4 rounded-control"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h2
          id={headingId}
          className="break-words font-serif text-[21px] font-semibold leading-tight md:text-2xl"
        >
          {series.title}
        </h2>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          {series.author && <span>{series.author}</span>}
          <SeriesStatusChip status={series.status} />
        </div>
      </div>
      <div className="pt-2">
        <SeriesSegments states={segments} />
      </div>
    </Link>
  );
}
